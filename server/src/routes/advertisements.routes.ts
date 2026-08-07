import { Router } from 'express';
import { prisma } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const advertisementsRouter = Router();

advertisementsRouter.get('/', async (_req, res) => {
  const ads = await prisma.advertisement.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({
    banners: ads.map((a) => ({
      id: a.id,
      title: a.title,
      subtitle: a.type.replace(/_/g, ' '),
      image: a.imageUrl,
      status: a.status,
    })),
  });
});

advertisementsRouter.post('/', requireAuth, requireRole('ADMINISTRATOR', 'SUB_ADMINISTRATOR'), async (req, res) => {
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
