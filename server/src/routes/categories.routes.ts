import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

export const categoriesRouter = Router();

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;
}

categoriesRouter.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  res.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.iconUrl,
      order: c.order,
      count: c._count.products,
    })),
  });
});

const createCategorySchema = z.object({
  name: z.string().min(2),
  icon: z.string().min(1),
});

categoriesRouter.post('/', requireAuth, requireRole('ADMINISTRATOR', 'SUB_ADMINISTRATOR'), async (req, res) => {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Category name and icon are required.' });

  const { name, icon } = parsed.data;
  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) return res.status(409).json({ error: 'A category with this name already exists.' });

  const count = await prisma.category.count();
  const category = await prisma.category.create({
    data: { name, iconUrl: icon, slug: slugify(name), order: count },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'CATEGORY_CREATED',
    module: 'Marketplace Admin',
    targetId: category.id,
    details: `Created category "${name}".`,
  });

  res.status(201).json({ category: { id: category.id, name: category.name, icon: category.iconUrl, order: category.order, count: 0 } });
});

// Category deletion is high-risk (cascades to listed products elsewhere in the flow),
// so it goes through the multi-admin approval workflow rather than deleting immediately.
categoriesRouter.post('/:id/request-delete', requireAuth, requireRole('ADMINISTRATOR', 'SUB_ADMINISTRATOR'), async (req, res) => {
  const category = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!category) return res.status(404).json({ error: 'Category not found.' });

  const request = await prisma.approvalRequest.create({
    data: {
      actionType: 'DELETE_CATEGORY',
      targetName: `Category: ${category.name}`,
      targetId: category.id,
      requestedById: req.user!.id,
      requestedByName: req.user!.name,
      requestedByEmail: req.user!.email,
      reason: req.body?.reason || 'Category deletion requested by administrator.',
      riskLevel: 'HIGH',
    },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'CRITICAL_APPROVAL_REQUESTED',
    module: 'Multi-Admin Approvals',
    targetId: request.id,
    details: `Created approval request ${request.id} to delete category "${category.name}".`,
  });

  res.status(201).json({ request });
});
