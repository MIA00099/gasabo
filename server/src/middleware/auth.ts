import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

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
