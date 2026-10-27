# Kigali Market database backup operations

## What this implementation provides

The admin's **Create backup snapshot** action exports selected Prisma tables to a timestamped JSON file. Snapshots are written atomically and verified with SHA-256 before success is returned. The scheduled job in `server/src/jobs/dailyBackup.ts` runs the same snapshot process and records an audit event.

**These JSON snapshots are not full PostgreSQL backups.** They do not include all database objects, sequences, migrations, external image storage, or a tested automated restore workflow. Do not treat them as the only disaster-recovery mechanism.

## Required production setup

1. Configure a persistent, private backup storage mount. On Railway, attach a volume and set `BACKUP_DIR` to its absolute mounted directory, e.g. `/data/backups`. A volume must be mounted on the **service that writes the backups**. Never use the deployment's ephemeral filesystem.
2. Keep backup storage private. Backup files contain sensitive account records and password hashes. Do not expose the mount through static-file serving or public URLs.
3. Configure a **separate scheduled Railway service** using the same repository, production database credentials, and a persistent backup volume. Use the command `npx tsx server/src/jobs/dailyBackup.ts` and a daily cron schedule such as `0 2 * * *` (UTC). Check Railway's current cron-service settings and whether the service shares or requires its own volume; do not assume volumes are shared.
4. Prefer provider-managed PostgreSQL backups / PITR or encrypted off-site backups in addition to JSON exports. A single Railway volume is not sufficient for disaster recovery.
5. Monitor cron execution and failures, verify backup checksums and record counts, and periodically test restoration into a **separate disposable database**. Never test restores against production.
6. Define retention and encryption policies before using production data; this implementation intentionally does **not** automatically delete snapshots.

## Manual test

In a non-production environment, run `npx tsx server/src/jobs/dailyBackup.ts` with a disposable database and `BACKUP_DIR` set to a private directory. Confirm a JSON file exists, is readable, and the audit event is recorded. Do not run this against production simply to test a change.

## Restore limitation

There is **no restore button** because importing a partial JSON snapshot directly into a live database can overwrite newer data or break relationships. Restoration requires a separately designed and tested recovery procedure.
