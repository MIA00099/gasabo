import { Router } from 'express';
import { prisma } from '../config/db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

export const advertisementsRouter = Router();

advertisementsRouter.get('/', async (_req, res) => {
  const ads = await prisma.advertisement.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({
    banners: ads.map((a) => ({
      id: a.id,
      title: a.title,
      subtitle: a.type.replace(/_/g, ' '),
      // type and targetUrl are what let the homepage pick out the HERO_SLIDER
      // ads and link each slide somewhere; the admin list uses them too.
      type: a.type,
      image: a.imageUrl,
      targetUrl: a.targetUrl || null,
      status: a.status,
      startDate: a.startDate,
      endDate: a.endDate,
    })),
  });
});

advertisementsRouter.post('/', requireAuth, requirePermission('ADVERTISEMENTS'), async (req, res) => {
  const { title, type, imageUrl, targetUrl, startDate, endDate } = req.body || {};
  if (!title || !imageUrl) return res.status(400).json({ error: 'Banner title and image are required.' });

  const ad = await prisma.advertisement.create({
    data: {
      title,
      type: type || 'HOMEPAGE_BANNER',
      imageUrl,
      targetUrl,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      status: 'ACTIVE',
    },
  });
  res.status(201).json({ banner: ad });
});

// Unlike categories/sellers, deleting a banner doesn't cascade to any other
// record and isn't structural data - it's marketing content, low-risk and
// easily recreated. Direct delete (same pattern as products), not the
// multi-admin approval workflow.
advertisementsRouter.delete('/:id', requireAuth, requirePermission('ADVERTISEMENTS'), async (req, res) => {
  await prisma.advertisement.delete({ where: { id: req.params.id } }).catch(() => {
    throw new Error('Banner not found or already deleted.');
  });
  res.json({ success: true });
});
