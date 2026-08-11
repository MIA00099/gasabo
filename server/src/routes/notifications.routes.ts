import { Router } from 'express';
import { prisma } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationsRouter = Router();

// Administrators/Sub-Administrators share the "ADMIN" recipient pool
// (broadcasts included); Sellers only ever see targeted warnings about their
// own listings (expiry reminders etc.) - never a broadcast.
function recipientTypeForRole(role: string): 'ADMIN' | 'SELLER' | null {
  if (role === 'ADMINISTRATOR' || role === 'SUB_ADMINISTRATOR') return 'ADMIN';
  if (role === 'SELLER') return 'SELLER';
  return null;
}

notificationsRouter.get('/', requireAuth, async (req, res) => {
  const recipientType = recipientTypeForRole(req.user!.role);
  if (!recipientType) return res.status(403).json({ error: 'Notifications are not available for this account type.' });

  const notifications = await prisma.notification.findMany({
    where: {
      recipientType,
      OR: [{ recipientId: null }, { recipientId: req.user!.id }],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ notifications });
});

notificationsRouter.post('/:id/read', requireAuth, async (req, res) => {
  const recipientType = recipientTypeForRole(req.user!.role);
  if (!recipientType) return res.status(403).json({ error: 'Notifications are not available for this account type.' });

  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification) return res.status(404).json({ error: 'Notification not found.' });
  // A Seller's targeted notifications are never a broadcast (recipientId is
  // always set for them), so this also guards against one seller marking
  // another seller's notification read by guessing an id.
  if (notification.recipientType !== recipientType || (notification.recipientId !== null && notification.recipientId !== req.user!.id)) {
    return res.status(403).json({ error: 'This notification does not belong to you.' });
  }

  await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
  res.json({ success: true });
});

notificationsRouter.post('/mark-all-read', requireAuth, async (req, res) => {
  const recipientType = recipientTypeForRole(req.user!.role);
  if (!recipientType) return res.status(403).json({ error: 'Notifications are not available for this account type.' });

  await prisma.notification.updateMany({
    where: {
      recipientType,
      OR: [{ recipientId: null }, { recipientId: req.user!.id }],
      isRead: false,
    },
    data: { isRead: true },
  });
  res.json({ success: true });
});
