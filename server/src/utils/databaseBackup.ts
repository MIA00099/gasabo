import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../config/db.js';

const BACKUP_DIR = path.resolve('server', 'backups');

const TABLES = {
  administrators: () => prisma.administrator.findMany({ orderBy: { createdAt: 'asc' } }),
  subAdministrators: () => prisma.subAdministrator.findMany({ orderBy: { createdAt: 'asc' } }),
  platformUsers: () => prisma.platformUser.findMany({ orderBy: { createdAt: 'asc' } }),
  sellers: () => prisma.seller.findMany({ orderBy: { createdAt: 'asc' } }),
  categories: () => prisma.category.findMany({ orderBy: { createdAt: 'asc' } }),
  products: () => prisma.product.findMany({ orderBy: { createdAt: 'asc' } }),
  productLikes: () => prisma.productLike.findMany({ orderBy: { createdAt: 'asc' } }),
  advertisements: () => prisma.advertisement.findMany({ orderBy: { createdAt: 'asc' } }),
  auditLogs: () => prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } }),
  realEstateContent: () => prisma.realEstateContent.findMany({ orderBy: { sectionKey: 'asc' } }),
  notifications: () => prisma.notification.findMany({ orderBy: { createdAt: 'asc' } }),
  approvalRequests: () => prisma.approvalRequest.findMany({ orderBy: { createdAt: 'asc' } }),
};

export async function createDatabaseBackup(actor: { id: string; name: string; role: string }) {
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  const tableEntries = await Promise.all(
    Object.entries(TABLES).map(async ([name, loader]) => [name, await loader()] as const),
  );
  const tables = Object.fromEntries(tableEntries);
  const counts = Object.fromEntries(tableEntries.map(([name, rows]) => [name, rows.length]));
  const createdAt = new Date().toISOString();
  const id = crypto.randomUUID();

  const payload = {
    id,
    createdAt,
    format: 'kigalimarket-prisma-json-v1',
    actor: { id: actor.id, name: actor.name, role: actor.role },
    counts,
    tables,
  };

  const fileName = `kigalimarket-backup-${createdAt.replace(/[:.]/g, '-')}-${id.slice(0, 8)}.json`;
  const filePath = path.join(BACKUP_DIR, fileName);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), { encoding: 'utf8', mode: 0o600 });
  await fs.chmod(filePath, 0o600).catch(() => {});

  return { id, createdAt, fileName, filePath, counts };
}
