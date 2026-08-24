import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { requireAuth, requireRole, requirePermission, requireExclusivePermission, hasModulePermission } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { notifySeller, notifyAdminsWithModulePermission } from '../utils/notify.js';

export const productsRouter = Router();

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;

function serializeProduct(p: any) {
  const now = Date.now();
  const expiresAtMs = p.expiresAt ? new Date(p.expiresAt).getTime() : null;
  let displayStatus: 'pending' | 'rejected' | 'active' | 'expiring_soon' | 'expired' | 'suspended' = 'active';
  if (p.status === 'PENDING') displayStatus = 'pending';
  else if (p.status === 'REJECTED') displayStatus = 'rejected';
  else if (p.status === 'SUSPENDED') displayStatus = 'suspended';
  else if (expiresAtMs !== null && expiresAtMs < now) displayStatus = 'expired';
  else if (expiresAtMs !== null && expiresAtMs - now < 1000 * 60 * 60 * 24 * 7) displayStatus = 'expiring_soon';

  return {
    id: p.id,
    title: p.title,
    description: p.description,
    price: p.price,
    currency: p.currency,
    district: p.district,
    condition: p.condition,
    images: JSON.parse(p.images || '[]'),
    sellerId: p.sellerId,
    sellerName: p.seller?.businessName,
    sellerPhone: p.seller?.contactPhone,
    categoryId: p.categoryId,
    category: p.category?.name,
    status: displayStatus,
    rejectionReason: p.rejectionReason || null,
    isFeatured: p.isFeatured,
    isTrending: p.isTrending,
    isRecommended: p.isRecommended,
    flashDealEndsAt: p.flashDealEndsAt ?? null,
    postedDate: p.createdAt,
    expiryDate: p.expiresAt,
    // Null until an administrator gives one. The storefront then shows no
    // stars at all rather than the hard-coded 4.8 the cards used to print.
    rating: p.rating ?? null,
    // Present whenever the query counted likes. A caller that did not ask for
    // them gets 0 rather than undefined, so nothing renders "undefined".
    likeCount: p._count?.likes ?? 0,
  };
}

// Counting likes on every product read costs one join; on a catalog this size
// that is cheaper than keeping a denormalised counter on Product honest.
const WITH_LIKES = { _count: { select: { likes: true } } } as const;

// GET /api/products - public listing with optional filters
productsRouter.get('/', async (req, res) => {
  const { category, district, search } = req.query as Record<string, string | undefined>;

  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      ...(category ? { categoryId: category } : {}),
      ...(district ? { district } : {}),
      ...(search
        ? {
            // mode: 'insensitive' because Prisma's `contains` is
            // case-sensitive on PostgreSQL - searching "macbook" returned
            // nothing while a listing titled "Apple MacBook Pro" sat right
            // there. Now that the hero search is the main way into the
            // catalog, that is not a small miss.
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: { seller: true, category: true, ...WITH_LIKES },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ products: products.map(serializeProduct) });
});

// GET /api/products/mine - seller's own listings (all statuses, including
// PENDING/REJECTED - a seller needs to see those to know a listing isn't
// live yet, or why it was declined)
productsRouter.get('/mine', requireAuth, requireRole('SELLER'), async (req, res) => {
  const products = await prisma.product.findMany({
    where: { sellerId: req.user!.id },
    include: { seller: true, category: true, ...WITH_LIKES },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ products: products.map(serializeProduct) });
});

// GET /api/products/pending - moderation queue, reserved for a
// Sub-Administrator holding PRODUCT_APPROVAL - not full Administrators (see
// requireExclusivePermission in middleware/auth.ts).
productsRouter.get('/pending', requireAuth, requireExclusivePermission('PRODUCT_APPROVAL'), async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { status: 'PENDING' },
    include: { seller: true, category: true, ...WITH_LIKES },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ products: products.map(serializeProduct) });
});

// GET /api/products/flash-deals - the products an admin has put on the
// homepage flash card, still counting down.
//
// A flash deal is any ACTIVE product with flashDealEndsAt in the future. The
// deadline is checked here rather than trusted from the client, so a deal
// disappears on its own the moment it expires - the card cannot show a timer
// counting up from zero. Soonest-ending first: the card shows [0], "View all
// deals" shows the rest.
//
// MUST stay above '/:id' - Express matches in order and '/:id' would treat
// "flash-deals" as a product id.
productsRouter.get('/flash-deals', async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE', flashDealEndsAt: { gt: new Date() } },
    include: { seller: true, category: true, ...WITH_LIKES },
    orderBy: { flashDealEndsAt: 'asc' },
  });
  res.json({ products: products.map(serializeProduct) });
});

// GET /api/products/:id - single public listing, backing the /product/:id
// deep link. Someone landing on that URL cold has no product list loaded,
// and the listing may not be in the first page of results anyway, so the
// client fetches it directly.
//
// ACTIVE only, matching GET / above: pending and rejected listings are not
// public, and serving one here would let anyone read unmoderated content by
// guessing a URL.
//
// MUST stay declared below the literal '/mine' and '/pending' routes.
// Express matches in registration order, so a '/:id' placed above them would
// swallow both and treat "mine"/"pending" as an id.
// ---------------------------------------------------------------------------
// Rating - set by an administrator
// ---------------------------------------------------------------------------
//
// A single number an admin assigns, not an average of buyer reviews. There is
// no review model here, and the star row on the storefront was printing a
// hard-coded 4.8 with "(128)" beside it on every listing, which is worse than
// showing nothing. Null clears it back to no stars.
const ratingSchema = z.object({
  rating: z.union([
    z.number().min(0).max(5).multipleOf(0.5),
    z.null(),
  ]),
});

productsRouter.patch('/:id/rating', requireAuth, requirePermission('PRODUCTS'), async (req, res) => {
  const parsed = ratingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Rating must be a number from 0 to 5 in half steps, or null to clear it.' });
  }

  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Listing not found.' });

  const product = await prisma.product.update({
    where: { id: existing.id },
    data: { rating: parsed.data.rating },
    include: { seller: true, category: true, ...WITH_LIKES },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'PRODUCT_RATING_SET',
    module: 'Marketplace Admin',
    targetId: product.id,
    details: parsed.data.rating === null
      ? `Cleared the rating on "${product.title}".`
      : `Rated "${product.title}" ${parsed.data.rating} of 5.`,
  });

  res.json({ product: serializeProduct(product) });
});

// ---------------------------------------------------------------------------
// Likes - left by buyers
// ---------------------------------------------------------------------------
//
// Deliberately open to signed-out visitors: this is a classifieds site where
// most people browse without an account, and requiring a sign-up to tap a
// heart would mean almost no listing ever gets one.
//
// The trade is that a like has to be attributed to something. A signed-in
// account is used when there is one; otherwise the browser sends a random key
// it generated and kept. That stops the same visitor counting twice by
// refreshing, and lets them take the like back. It does not stop somebody who
// sets out to inflate a number by clearing storage or scripting the endpoint -
// that requires accounts to like at all, which is the client's call, not a
// detail to decide here.
const VISITOR_HEADER = 'x-visitor-key';

function visitorKeyFor(req: any): string | null {
  if (req.user?.id) return `user:${req.user.id}`;
  const header = req.header(VISITOR_HEADER);
  if (typeof header !== 'string') return null;
  const key = header.trim();
  // Bounded so the column cannot be used as free storage.
  if (key.length < 8 || key.length > 100) return null;
  return `visitor:${key}`;
}

productsRouter.post('/:id/like', async (req, res) => {
  const key = visitorKeyFor(req);
  if (!key) return res.status(400).json({ error: 'Missing visitor key.' });

  const product = await prisma.product.findFirst({
    where: { id: req.params.id, status: 'ACTIVE' },
    select: { id: true },
  });
  // Only a live listing can be liked - a pending one is not public, and
  // answering 404 keeps this from being a way to probe for unmoderated ids.
  if (!product) return res.status(404).json({ error: 'Listing not found.' });

  // Liking twice is the same as liking once rather than an error: the button
  // can be double-tapped, and two tabs can be open on the same listing.
  await prisma.productLike.upsert({
    where: { productId_visitorKey: { productId: product.id, visitorKey: key } },
    create: { productId: product.id, visitorKey: key },
    update: {},
  });

  const likeCount = await prisma.productLike.count({ where: { productId: product.id } });
  res.status(201).json({ liked: true, likeCount });
});

productsRouter.delete('/:id/like', async (req, res) => {
  const key = visitorKeyFor(req);
  if (!key) return res.status(400).json({ error: 'Missing visitor key.' });

  const product = await prisma.product.findFirst({
    where: { id: req.params.id, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!product) return res.status(404).json({ error: 'Listing not found.' });

  // deleteMany, not delete: removing a like that was never there is a no-op
  // rather than a 500, which is what a double-tap on the filled heart sends.
  await prisma.productLike.deleteMany({
    where: { productId: product.id, visitorKey: key },
  });

  const likeCount = await prisma.productLike.count({ where: { productId: product.id } });
  res.json({ liked: false, likeCount });
});

// Whether THIS visitor has already liked a listing, so the heart renders
// filled on a page they come back to.
productsRouter.get('/:id/like', async (req, res) => {
  const key = visitorKeyFor(req);
  const likeCount = await prisma.productLike.count({ where: { productId: req.params.id } });
  if (!key) return res.json({ liked: false, likeCount });

  const mine = await prisma.productLike.findUnique({
    where: { productId_visitorKey: { productId: req.params.id, visitorKey: key } },
    select: { id: true },
  });
  res.json({ liked: Boolean(mine), likeCount });
});

// GET /api/products/:id/related - the "More <category> Products" row on a
// listing page.
//
// Server-side rather than filtering state.products in the browser, because
// that array only holds whatever the last grid fetch returned. Opening a
// listing from a shared link, a Google result, or the sitemap fetches the one
// listing and nothing else, so the in-memory filter found no siblings and the
// whole section silently disappeared - exactly the entry points where a
// related row matters most.
//
// Declared above '/:id' for readability; there is no conflict either way,
// since '/:id' matches a single path segment and cannot swallow two.
productsRouter.get('/:id/related', async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { id: req.params.id, status: 'ACTIVE' },
    select: { id: true, categoryId: true },
  });

  // A missing or unapproved listing has no siblings to show. Empty list, not
  // a 404 - the detail page above it already decides what a missing listing
  // means, and this row must never be what breaks the page.
  if (!product) return res.json({ products: [] });

  const related = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      categoryId: product.categoryId,
      id: { not: product.id },
    },
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: { seller: true, category: true, ...WITH_LIKES },
  });

  res.json({ products: related.map(serializeProduct) });
});


productsRouter.get('/:id', async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { id: req.params.id, status: 'ACTIVE' },
    include: { seller: true, category: true, ...WITH_LIKES },
  });

  if (!product) return res.status(404).json({ error: 'Listing not found.' });

  res.json({ product: serializeProduct(product) });
});

const createProductSchema = z.object({
  title: z.string().min(3),
  categoryId: z.string().min(1),
  price: z.number().positive(),
  district: z.string().min(2),
  condition: z.string().min(1),
  description: z.string().min(1),
  // Capped server-side, not just in the form: the UI has always promised
  // "Max 10 photos" and never enforced it, and a client can post whatever it
  // likes. Ten thumbnails is also about where the detail page gallery stops
  // being usable.
  images: z.array(z.string().min(1)).min(1).max(10),
});

productsRouter.post('/', requireAuth, requireRole('SELLER'), async (req, res) => {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please complete all required product fields.', details: parsed.error.flatten() });
  }
  const { title, categoryId, price, district, condition, description, images } = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return res.status(400).json({ error: 'Selected category does not exist.' });

  // PENDING, not ACTIVE - a new listing now needs an admin's approval before
  // it's visible on the public marketplace (GET / only ever returns ACTIVE).
  // expiresAt stays null until approval - the 6-month clock starts when the
  // listing actually goes live, not while it's sitting in the review queue.
  const product = await prisma.product.create({
    data: {
      title,
      description,
      price,
      district,
      condition,
      images: JSON.stringify(images),
      categoryId,
      sellerId: req.user!.id,
      status: 'PENDING',
    },
    include: { seller: true, category: true, ...WITH_LIKES },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: 'SELLER',
    actorName: req.user!.name,
    action: 'PRODUCT_SUBMITTED_FOR_REVIEW',
    module: 'Marketplace',
    targetId: product.id,
    details: `Submitted product "${title}" for admin approval.`,
  });

  // The sidebar badge (see AdminDashboardView.js) only updates once an admin
  // is actually looking at the app - a real push notification is what
  // actually gets noticed if nobody happens to have it open right now.
  // Scoped to PRODUCT_APPROVAL specifically and excludes full Administrators
  // (see requireExclusivePermission in middleware/auth.ts) - moderation is
  // now reserved for a Sub-Administrator holding that permission, so anyone
  // else getting pinged about a listing they can't act on is a false alarm.
  await notifyAdminsWithModulePermission('PRODUCT_APPROVAL', {
    type: 'PRODUCT_SUBMITTED',
    message: `${req.user!.name} submitted a new listing "${title}" - needs approval before it goes live.`,
    excludeFullAdmins: true,
  });

  res.status(201).json({ product: serializeProduct(product) });
});

const rejectSchema = z.object({ reason: z.string().min(3, 'A rejection reason is required.') });

productsRouter.post('/:id/approve', requireAuth, requireExclusivePermission('PRODUCT_APPROVAL'), async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  if (product.status !== 'PENDING') {
    return res.status(409).json({ error: 'This listing is not awaiting review (it may have already been resolved).' });
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { status: 'ACTIVE', expiresAt: new Date(Date.now() + SIX_MONTHS_MS), rejectionReason: null },
    include: { seller: true, category: true, ...WITH_LIKES },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'PRODUCT_APPROVED',
    module: 'Marketplace Admin',
    targetId: product.id,
    details: `Approved product "${product.title}" - now live for 6 months.`,
  });

  await notifySeller({
    sellerId: product.sellerId,
    type: 'PRODUCT_APPROVED',
    message: `Your listing "${product.title}" was approved and is now live on the marketplace.`,
  });

  res.json({ product: serializeProduct(updated) });
});

productsRouter.post('/:id/reject', requireAuth, requireExclusivePermission('PRODUCT_APPROVAL'), async (req, res) => {
  const parsed = rejectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please provide a reason for rejecting this listing.' });

  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  if (product.status !== 'PENDING') {
    return res.status(409).json({ error: 'This listing is not awaiting review (it may have already been resolved).' });
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { status: 'REJECTED', rejectionReason: parsed.data.reason },
    include: { seller: true, category: true, ...WITH_LIKES },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'PRODUCT_REJECTED',
    module: 'Marketplace Admin',
    targetId: product.id,
    details: `Rejected product "${product.title}": ${parsed.data.reason}`,
  });

  await notifySeller({
    sellerId: product.sellerId,
    type: 'PRODUCT_REJECTED',
    message: `Your listing "${product.title}" was not approved. Reason: ${parsed.data.reason}`,
  });

  res.json({ product: serializeProduct(updated) });
});

productsRouter.post('/:id/renew', requireAuth, requireRole('SELLER'), async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  if (product.sellerId !== req.user!.id) return res.status(403).json({ error: 'You can only renew your own listings.' });
  // "Renew" means confirming an already-approved listing is still in stock -
  // not a back door around moderation. A PENDING listing is already waiting
  // on the same result renewing would produce; a REJECTED one needs a new
  // listing, not a status flip.
  if (product.status === 'PENDING') {
    return res.status(409).json({ error: 'This listing is still awaiting admin review - nothing to renew yet.' });
  }
  if (product.status === 'REJECTED') {
    return res.status(409).json({ error: 'This listing was rejected. Please post a new listing instead of renewing it.' });
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { status: 'ACTIVE', expiresAt: new Date(Date.now() + SIX_MONTHS_MS), expiryReminderSentAt: null },
    include: { seller: true, category: true, ...WITH_LIKES },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: 'SELLER',
    actorName: req.user!.name,
    action: 'PRODUCT_RENEWED',
    module: 'Marketplace',
    targetId: product.id,
    details: `Renewed product "${product.title}" for 6 months.`,
  });

  res.json({ product: serializeProduct(updated) });
});

productsRouter.delete('/:id', requireAuth, async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const isOwner = req.user!.role === 'SELLER' && product.sellerId === req.user!.id;
  const isAdminWithAccess = (req.user!.role === 'ADMINISTRATOR' || req.user!.role === 'SUB_ADMINISTRATOR')
    && (await hasModulePermission(req.user!, 'PRODUCTS'));
  if (!isOwner && !isAdminWithAccess) {
    return res.status(403).json({ error: 'You do not have permission to delete this product.' });
  }

  await prisma.product.delete({ where: { id: product.id } });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'PRODUCT_DELETED',
    module: 'Marketplace',
    targetId: product.id,
    details: `Deleted product "${product.title}".`,
  });

  res.json({ success: true });
});

// Set or clear a product's Flash Deal deadline. A future ISO date makes it an
// active flash deal; null takes it off the card. The value is an absolute
// instant, not a duration, so the countdown is real: every viewer sees the
// same finish time and it ends when that time arrives, not per-visit.
const flashDealSchema = z.object({
  endsAt: z.union([z.string().datetime(), z.null()]),
});

productsRouter.patch('/:id/flash-deal', requireAuth, requirePermission('PRODUCTS'), async (req, res) => {
  const parsed = flashDealSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Provide an end time (ISO date) or null to clear the deal.' });
  }

  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
  if (endsAt && endsAt.getTime() <= Date.now()) {
    return res.status(400).json({ error: 'The flash deal end time must be in the future.' });
  }

  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { flashDealEndsAt: endsAt },
    include: { seller: true, category: true, ...WITH_LIKES },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'PRODUCT_FLASH_DEAL_UPDATED',
    module: 'Marketplace Admin',
    targetId: product.id,
    details: endsAt
      ? `Set "${product.title}" as a flash deal ending ${endsAt.toISOString()}.`
      : `Cleared the flash deal on "${product.title}".`,
  });

  res.json({ product: serializeProduct(updated) });
});

const flagSchema = z.object({
  flag: z.enum(['isFeatured', 'isTrending', 'isRecommended']),
  value: z.boolean(),
});

productsRouter.patch('/:id/flags', requireAuth, requirePermission('PRODUCTS'), async (req, res) => {
  const parsed = flagSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid flag update.' });

  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { [parsed.data.flag]: parsed.data.value },
    include: { seller: true, category: true, ...WITH_LIKES },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'PRODUCT_FLAG_UPDATED',
    module: 'Marketplace Admin',
    targetId: product.id,
    details: `Set ${parsed.data.flag} = ${parsed.data.value} on "${product.title}".`,
  });

  res.json({ product: serializeProduct(updated) });
});
