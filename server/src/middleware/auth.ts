import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMINISTRATOR' | 'SUB_ADMINISTRATOR' | 'SELLER' | 'USER';
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

export function requireRole(...roles: AuthUser['role'][]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

// requireRole('ADMINISTRATOR', 'SUB_ADMINISTRATOR') only ever checked the
// coarse role - it let every Sub-Administrator through every admin route
// regardless of their actual permissions array, which was otherwise only
// ever displayed/edited, never enforced. This checks the specific module a
// route needs. Administrators always pass (their access is hardcoded to
// "everything" - see fullPermissions() in utils/permissions.ts). Looked up
// fresh from the DB on every request rather than trusted from the JWT, so a
// permission change (server/src/routes/approvals.routes.ts) takes effect on
// the sub-admin's very next request instead of waiting out their 7-day token.
export async function hasModulePermission(user: AuthUser, moduleKey: string): Promise<boolean> {
  if (user.role === 'ADMINISTRATOR') return true;
  if (user.role !== 'SUB_ADMINISTRATOR') return false;
  const subAdmin = await prisma.subAdministrator.findUnique({ where: { id: user.id } });
  if (!subAdmin) return false;
  try {
    const permissions: string[] = JSON.parse(subAdmin.permissions || '[]');
    return permissions.includes(moduleKey);
  } catch {
    return false;
  }
}

// Middleware wrapper around hasModulePermission() for routes where every
// caller needs the same module (most routes). For routes with mixed
// authorization (e.g. "owner OR admin-with-permission" on product deletion),
// call hasModulePermission() directly instead.
export function requirePermission(moduleKey: string) {
  return async (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    const allowed = await hasModulePermission(req.user, moduleKey);
    if (!allowed) {
      return res.status(403).json({ error: `You don't have access to this module. Ask an Administrator to grant "${moduleKey}" permission.` });
    }
    next();
  };
}
