import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

export const productsRouter = Router();

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;

function serializeProduct(p: any) {
  const now = Date.now();
  const expiresAtMs = p.expiresAt ? new Date(p.expiresAt).getTime() : null;
  let displayStatus: 'active' | 'expiring_soon' | 'expired' | 'suspended' = 'active';
  if (p.status === 'SUSPENDED') displayStatus = 'suspended';
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

// GET /api/products/mine - seller's own listings (all statuses)
productsRouter.get('/mine', requireAuth, requireRole('SELLER'), async (req, res) => {
  const products = await prisma.product.findMany({
    where: { sellerId: req.user!.id },
    include: { seller: true, category: true },
    orderBy: { createdAt: 'desc' },
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
      expiresAt: new Date(Date.now() + SIX_MONTHS_MS),
    },
    include: { seller: true, category: true },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: 'SELLER',
    actorName: req.user!.name,
    action: 'PRODUCT_PUBLISHED',
    module: 'Marketplace',
    targetId: product.id,
    details: `Published product "${title}" (Active 6 Months).`,
  });

  res.status(201).json({ product: serializeProduct(product) });
});

productsRouter.post('/:id/renew', requireAuth, requireRole('SELLER'), async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  if (product.sellerId !== req.user!.id) return res.status(403).json({ error: 'You can only renew your own listings.' });

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { status: 'ACTIVE', expiresAt: new Date(Date.now() + SIX_MONTHS_MS) },
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
  const isAdmin = req.user!.role === 'ADMINISTRATOR' || req.user!.role === 'SUB_ADMINISTRATOR';
  if (!isOwner && !isAdmin) {
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

productsRouter.patch('/:id/flags', requireAuth, requireRole('ADMINISTRATOR', 'SUB_ADMINISTRATOR'), async (req, res) => {
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
