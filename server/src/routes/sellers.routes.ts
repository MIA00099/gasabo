import { Router } from 'express';
import { prisma } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

export const sellersRouter = Router();

sellersRouter.get('/', requireAuth, requireRole('ADMINISTRATOR', 'SUB_ADMINISTRATOR'), async (_req, res) => {
  const sellers = await prisma.seller.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { products: true } } },
  });
  res.json({
    sellers: sellers.map((s) => ({
      id: s.id,
      name: s.businessName,
      email: s.email,
      phone: s.contactPhone,
      district: s.district,
      status: s.status.toLowerCase(),
      joinedDate: s.createdAt,
      productsCount: s._count.products,
    })),
  });
});

sellersRouter.post('/:id/reset-password', requireAuth, requireRole('ADMINISTRATOR', 'SUB_ADMINISTRATOR'), async (req, res) => {
  const seller = await prisma.seller.findUnique({ where: { id: req.params.id } });
  if (!seller) return res.status(404).json({ error: 'Seller not found.' });

  // In production this would email a reset link instead of returning a temp password directly.
  const tempPassword = Math.random().toString(36).slice(-10);
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.default.hash(tempPassword, 10);
  await prisma.seller.update({ where: { id: seller.id }, data: { passwordHash } });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'SELLER_PASSWORD_RESET',
    module: 'Seller Admin',
    targetId: seller.id,
    details: `Reset password for seller ${seller.businessName}.`,
  });

  res.json({ success: true, tempPassword });
});

sellersRouter.post('/:id/request-delete', requireAuth, requireRole('ADMINISTRATOR', 'SUB_ADMINISTRATOR'), async (req, res) => {
  const seller = await prisma.seller.findUnique({ where: { id: req.params.id } });
  if (!seller) return res.status(404).json({ error: 'Seller not found.' });

  const request = await prisma.approvalRequest.create({
    data: {
      actionType: 'DELETE_SELLER_ACCOUNT',
      targetName: `Seller: ${seller.businessName} (ID: ${seller.id})`,
      targetId: seller.id,
      requestedById: req.user!.id,
      requestedByName: req.user!.name,
      requestedByEmail: req.user!.email,
      reason: req.body?.reason || 'Account deletion initiated by administrator.',
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
    details: `Created approval request ${request.id} to delete seller "${seller.businessName}".`,
  });

  res.status(201).json({ request });
});
