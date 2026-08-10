import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { requireAuth, requireRole, requirePermission, hasModulePermission } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { notifySeller } from '../utils/notify.js';

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
    postedDate: p.createdAt,
    expiryDate: p.expiresAt,
  };
}

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
            OR: [
              { title: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    },
    include: { seller: true, category: true },
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
    include: { seller: true, category: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ products: products.map(serializeProduct) });
});

// GET /api/products/pending - admin moderation queue
productsRouter.get('/pending', requireAuth, requirePermission('PRODUCTS'), async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { status: 'PENDING' },
    include: { seller: true, category: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ products: products.map(serializeProduct) });
});

const createProductSchema = z.object({
  title: z.string().min(3),
  categoryId: z.string().min(1),
  price: z.number().positive(),
  district: z.string().min(2),
  condition: z.string().min(1),
  description: z.string().min(1),
  images: z.array(z.string()).min(1),
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
    include: { seller: true, category: true },
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

  res.status(201).json({ product: serializeProduct(product) });
});

const rejectSchema = z.object({ reason: z.string().min(3, 'A rejection reason is required.') });

productsRouter.post('/:id/approve', requireAuth, requirePermission('PRODUCTS'), async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  if (product.status !== 'PENDING') {
    return res.status(409).json({ error: 'This listing is not awaiting review (it may have already been resolved).' });
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { status: 'ACTIVE', expiresAt: new Date(Date.now() + SIX_MONTHS_MS), rejectionReason: null },
    include: { seller: true, category: true },
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

productsRouter.post('/:id/reject', requireAuth, requirePermission('PRODUCTS'), async (req, res) => {
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
    include: { seller: true, category: true },
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
    include: { seller: true, category: true },
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
    include: { seller: true, category: true },
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
