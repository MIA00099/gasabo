import { prisma } from '../config/db.js';

// Email is @unique per-table (Administrator/SubAdministrator/Seller/PlatformUser),
// not globally - login tries each table in sequence, so the same email existing
// in two tables would make one account silently unreachable (shadowed by
// whichever table login checks first). Check across all four before creating
// or renaming into an email, so that footgun can't happen.
export async function isEmailTaken(email: string, excludeId?: string, excludeTable?: 'subAdmin' | 'seller') {
  const [admin, subAdmin, seller, user] = await Promise.all([
    prisma.administrator.findUnique({ where: { email } }),
    prisma.subAdministrator.findUnique({ where: { email } }),
    prisma.seller.findUnique({ where: { email } }),
    prisma.platformUser.findUnique({ where: { email } }),
  ]);
  if (admin) return true;
  if (subAdmin && !(excludeTable === 'subAdmin' && subAdmin.id === excludeId)) return true;
  if (seller && !(excludeTable === 'seller' && seller.id === excludeId)) return true;
  if (user) return true;
  return false;
}
