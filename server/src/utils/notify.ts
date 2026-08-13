import { prisma } from '../config/db.js';

// recipientId: null broadcasts to every Administrator/Sub-Administrator (there's
// no per-recipient read-receipt table, so marking a broadcast notification read
// marks it read for everyone - an accepted limitation of this schema, not a bug).
export async function notifyAdmins(opts: { type: string; message: string; recipientId?: string | null }) {
  await prisma.notification.create({
    data: {
      recipientType: 'ADMIN',
      recipientId: opts.recipientId ?? null,
      type: opts.type,
      message: opts.message,
    },
  });
}

// notifyAdmins() broadcasts to every admin-tier account regardless of what
// they're actually scoped to - fine for things every admin can act on
// (Multi-Admin Approvals), but misleading for module-specific events. A
// Sub-Administrator scoped to ONLY the Approvals permission (see
// rbac.routes.ts) has no product_mgmt permission, so "Marketplace
// Management" isn't even in their sidebar - pinging them about a pending
// product listing they structurally can't act on is a false alarm, not a
// notification. This targets only Administrators (always eligible) and
// Sub-Administrators who actually hold the relevant module permission,
// as individual per-recipient rows rather than one broadcast row.
//
// excludeFullAdmins: for PRODUCT_APPROVAL specifically, full Administrators
// no longer have access to the moderation queue (see requireExclusivePermission
// in middleware/auth.ts) - pinging them about a listing they now structurally
// can't act on would be the exact same false alarm this function exists to
// avoid, just for the Administrator role instead of a scoped Sub-Administrator.
export async function notifyAdminsWithModulePermission(
  moduleKey: string,
  opts: { type: string; message: string; excludeFullAdmins?: boolean }
) {
  const [admins, subAdmins] = await Promise.all([
    opts.excludeFullAdmins ? Promise.resolve([]) : prisma.administrator.findMany({ select: { id: true } }),
    prisma.subAdministrator.findMany({ select: { id: true, permissions: true } }),
  ]);

  const eligibleSubAdminIds = subAdmins
    .filter((s) => {
      try {
        return (JSON.parse(s.permissions || '[]') as string[]).includes(moduleKey);
      } catch {
        return false;
      }
    })
    .map((s) => s.id);

  const recipientIds = [...admins.map((a) => a.id), ...eligibleSubAdminIds];
  if (recipientIds.length === 0) return;

  await prisma.notification.createMany({
    data: recipientIds.map((recipientId) => ({
      recipientType: 'ADMIN' as const,
      recipientId,
      type: opts.type,
      message: opts.message,
    })),
  });
}

// Always targeted at one specific seller - unlike notifyAdmins there's no
// broadcast case here, a seller should only ever see warnings about their
// own listings.
export async function notifySeller(opts: { sellerId: string; type: string; message: string }) {
  await prisma.notification.create({
    data: {
      recipientType: 'SELLER',
      recipientId: opts.sellerId,
      type: opts.type,
      message: opts.message,
    },
  });
}
