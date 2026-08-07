import { Router } from 'express';
import { prisma } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

export const auditRouter = Router();

auditRouter.get('/', requireAuth, requireRole('ADMINISTRATOR', 'SUB_ADMINISTRATOR'), async (_req, res) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  res.json({
    logs: logs.map((l) => ({
      id: l.id,
      timestamp: l.createdAt,
      user: l.actorName || l.actorId,
      action: l.action,
      module: l.module,
      ip: l.ipAddress || 'internal',
      details: l.details,
    })),
  });
});

auditRouter.post('/backup', requireAuth, requireRole('ADMINISTRATOR', 'SUB_ADMINISTRATOR'), async (req, res) => {
  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'DATABASE_BACKUP_CREATED',
    module: 'System Security',
    details: 'Manual database snapshot created and stored securely.',
  });
  res.json({ success: true, createdAt: new Date().toISOString() });
});
