import { Router } from 'express';
import { prisma } from '../config/db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { createDatabaseBackup } from '../utils/databaseBackup.js';

export const auditRouter = Router();

auditRouter.get('/', requireAuth, requirePermission('SYSTEM_SETTINGS'), async (_req, res) => {
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

auditRouter.post('/backup', requireAuth, requirePermission('SYSTEM_SETTINGS'), async (req, res) => {
  const backup = await createDatabaseBackup({
    id: req.user!.id,
    name: req.user!.name,
    role: req.user!.role,
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'DATABASE_BACKUP_CREATED',
    module: 'System Security',
    details: `Manual database snapshot created: ${backup.fileName}.`,
  });
  res.json({
    success: true,
    id: backup.id,
    createdAt: backup.createdAt,
    fileName: backup.fileName,
    counts: backup.counts,
  });
});
