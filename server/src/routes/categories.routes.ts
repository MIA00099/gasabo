import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { notifyAdmins } from '../utils/notify.js';

export const categoriesRouter = Router();

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;
}

categoriesRouter.get('/', async (_req, res) => {
  // Seed the default categories only when the table is empty (a fresh database),
  // not on every request.
  //
  // This block used to run 11 case-insensitive findFirst queries on EVERY GET
  // before returning the list - eleven sequential round trips to the database,
  // which is what made /categories take ~10s and, in turn, made the homepage
  // show its default hero slides and an empty nav for that whole time before the
  // real content arrived. It also re-created any default category an admin had
  // deleted, on the very next page load, so a default could never be removed.
  // Guarding on an empty table keeps the fresh-DB safety net and makes the
  // normal path a single count().
  const existingCount = await prisma.category.count();
  if (existingCount === 0) {
    const defaultSeeds = [
      { name: 'Electronics & Tech', iconUrl: '💻' },
      { name: 'Vehicles & Automotive', iconUrl: '🚗' },
      { name: 'house', iconUrl: '🏠' },
      { name: 'land', iconUrl: '🏞️' },
      { name: 'motorcycle', iconUrl: '🏍️' },
      { name: 'Agri-Business & Produce', iconUrl: '☕' },
      { name: 'Real Estate', iconUrl: '🏠' },
      { name: 'Fashion & Handcrafts', iconUrl: '👗' },
      { name: 'Home & Furniture', iconUrl: '🛋️' },
      { name: 'Services', iconUrl: '🛠️' },
      { name: 'Jobs', iconUrl: '💼' },
    ];
    for (let i = 0; i < defaultSeeds.length; i++) {
      const seed = defaultSeeds[i];
      await prisma.category.create({
        data: { name: seed.name, iconUrl: seed.iconUrl, slug: slugify(seed.name), order: i },
      }).catch(() => {});
    }
  }

  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { products: { where: { status: 'ACTIVE' } } } } },
  });
  res.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: /^real[\s_-]?estate$/i.test(c.name) ? 'Real Estate' : c.name,
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

categoriesRouter.post('/', requireAuth, requirePermission('CATEGORIES'), async (req, res) => {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Category name and icon are required.' });

  const { name, icon } = parsed.data;

  // Case-insensitively, because slugify() lowercases: "books" and "Books"
  // are different values for the unique `name` column but produce the same
  // unique `slug`. A case-sensitive findUnique here therefore let "books"
  // past this guard and straight into a P2002 on slug, which nothing caught -
  // an admin adding a category that already existed got a 500 reading
  // "Something went wrong on our end" instead of being told it was a
  // duplicate.
  const existing = await prisma.category.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) return res.status(409).json({ error: `"${existing.name}" already exists as a category.` });

  // Separately, two genuinely different names can still collide once
  // slugified - "Home & Furniture" and "Home Furniture" both become
  // "home-furniture". Same 409 rather than a 500.
  const slug = slugify(name);
  const slugTaken = await prisma.category.findUnique({ where: { slug } });
  if (slugTaken) {
    return res.status(409).json({
      error: `This name is too close to the existing category "${slugTaken.name}". Please choose a different one.`,
    });
  }

  const count = await prisma.category.count();
  let category;
  try {
    category = await prisma.category.create({
      data: { name, iconUrl: icon, slug, order: count },
    });
  } catch (err: any) {
    // P2002 = unique constraint violation. Reachable despite the checks
    // above if two admins submit the same name at the same time.
    if (err?.code === 'P2002') {
      return res.status(409).json({ error: 'A category with this name already exists.' });
    }
    throw err;
  }

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

const updateIconSchema = z.object({
  icon: z.string().min(1),
});

// Changing a category's icon is cosmetic and reversible - a wrong logo is
// fixed by uploading the right one - so it takes effect directly, unlike
// deletion below, which cascades into listed products and needs a second
// Administrator. It is still audited: an icon is the category's public face
// and swapping one is worth a trail.
categoriesRouter.patch('/:id/icon', requireAuth, requirePermission('CATEGORIES'), async (req, res) => {
  const parsed = updateIconSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'An icon is required.' });

  const category = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!category) return res.status(404).json({ error: 'Category not found.' });

  const updated = await prisma.category.update({
    where: { id: category.id },
    data: { iconUrl: parsed.data.icon },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'CATEGORY_ICON_CHANGED',
    module: 'Marketplace Admin',
    targetId: category.id,
    details: `Changed the icon for category "${category.name}".`,
  });

  const count = await prisma.product.count({
    where: { categoryId: category.id, status: 'ACTIVE' },
  });

  res.json({
    category: {
      id: updated.id,
      name: updated.name,
      icon: updated.iconUrl,
      order: updated.order,
      count,
    },
  });
});


// Category deletion is high-risk (cascades to listed products elsewhere in the flow),
// so it goes through the multi-admin approval workflow rather than deleting immediately.
categoriesRouter.post('/:id/request-delete', requireAuth, requirePermission('CATEGORIES'), async (req, res) => {
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

  await notifyAdmins({
    type: 'APPROVAL_REQUEST_CREATED',
    message: `${req.user!.name} requested deletion of category "${category.name}" - needs a second Administrator's approval.`,
  });

  res.status(201).json({ request });
});
