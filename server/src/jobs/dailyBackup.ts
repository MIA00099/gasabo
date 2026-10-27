/**
 * Run from a separate Railway cron service once daily.
 * This is deliberately not an in-process timer: restarts and multiple web
 * replicas must not silently create overlapping scheduled backups.
 */
import { prisma } from '../config/db.js';
import { createDatabaseBackup } from '../utils/databaseBackup.js';
import { logAudit } from '../utils/audit.js';

async function main() {
  if (!process.env.BACKUP_DIR) {
    throw new Error('BACKUP_DIR is required; mount persistent backup storage first.');
  }
  const backup = await createDatabaseBackup({
    id: 'system-scheduled-backup',
    name: 'Automated Backup',
    role: 'SYSTEM',
  });
  await logAudit({
    actorId: 'system-scheduled-backup',
    actorType: 'SYSTEM',
    actorName: 'Automated Backup',
    action: 'DATABASE_BACKUP_CREATED',
    module: 'System Security',
    details: `Scheduled database snapshot verified: ${backup.fileName} (SHA-256 ${backup.sha256}).`,
  });
  console.log(JSON.stringify({
    success: true,
    createdAt: backup.createdAt,
    fileName: backup.fileName,
    counts: backup.counts,
    sha256: backup.sha256,
  }));
}

main()
  .catch((error) => {
    console.error('Scheduled backup failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
