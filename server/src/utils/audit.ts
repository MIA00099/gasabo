import { prisma } from '../config/db.js';

export async function logAudit(opts: {
  actorId: string;
  actorType: 'ADMINISTRATOR' | 'SUB_ADMINISTRATOR' | 'SYSTEM';
  action: string;
  module: string;
  targetId?: string;
  details?: Record<string, unknown> | string;
  ipAddress?: string;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: opts.actorId,
      actorType: opts.actorType,
      action: opts.action,
      module: opts.module,
      targetId: opts.targetId,
      details: typeof opts.details === 'string' ? opts.details : JSON.stringify(opts.details ?? {}),
      ipAddress: opts.ipAddress,
    },
  });
}
