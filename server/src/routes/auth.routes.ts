import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { fullPermissions, permissionsFromModuleList } from '../utils/permissions.js';
import { logAudit } from '../utils/audit.js';

export const authRouter = Router();

const registerSellerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  district: z.string().min(2),
  password: z.string().min(6),
});

authRouter.post('/register/seller', async (req, res) => {
  const parsed = registerSellerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please fill in all fields correctly.', details: parsed.error.flatten() });
  }
  const { fullName, email, phone, district, password } = parsed.data;

  const existing = await prisma.seller.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const seller = await prisma.seller.create({
    data: { email, passwordHash, businessName: fullName, contactPhone: phone, district },
  });

  await logAudit({
    actorId: seller.id,
    actorType: 'SYSTEM',
    actorName: seller.businessName,
    action: 'SELLER_REGISTRATION',
    module: 'Seller Portal',
    targetId: seller.id,
    details: { email, district },
  });

  const authUser = { id: seller.id, email: seller.email, name: seller.businessName, role: 'SELLER' as const };
  const token = signToken(authUser);
  res.status(201).json({
    token,
    user: { ...authUser, phone: seller.contactPhone, district: seller.district },
  });
});

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Email/username and password are required.' });
  }
  const { email, password } = parsed.data;

  // Try each account type in turn - administrators, sub-admins, sellers, then platform users.
  const admin = await prisma.administrator.findUnique({ where: { email } });
  if (admin && (await bcrypt.compare(password, admin.passwordHash))) {
    await prisma.administrator.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    const authUser = { id: admin.id, email: admin.email, name: admin.name, role: 'ADMINISTRATOR' as const };
    await logAudit({ actorId: admin.id, actorType: 'ADMINISTRATOR', actorName: admin.name, action: 'LOGIN_SUCCESS', module: 'Security & Auth', details: `${admin.name} authenticated.` });
    return res.json({ token: signToken(authUser), user: { ...authUser, permissions: fullPermissions() } });
  }

  const subAdmin = await prisma.subAdministrator.findUnique({ where: { email } });
  if (subAdmin && (await bcrypt.compare(password, subAdmin.passwordHash))) {
    await prisma.subAdministrator.update({ where: { id: subAdmin.id }, data: { lastLoginAt: new Date() } });
    const authUser = { id: subAdmin.id, email: subAdmin.email, name: subAdmin.name, role: 'SUB_ADMINISTRATOR' as const };
    await logAudit({ actorId: subAdmin.id, actorType: 'SUB_ADMINISTRATOR', actorName: subAdmin.name, action: 'LOGIN_SUCCESS', module: 'Security & Auth', details: `${subAdmin.name} authenticated.` });
    return res.json({
      token: signToken(authUser),
      user: { ...authUser, permissions: permissionsFromModuleList(JSON.parse(subAdmin.permissions || '[]')) },
    });
  }

  const seller = await prisma.seller.findUnique({ where: { email } });
  if (seller && (await bcrypt.compare(password, seller.passwordHash))) {
    if (seller.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'This seller account has been suspended. Contact support.' });
    }
    await prisma.seller.update({ where: { id: seller.id }, data: { lastLoginAt: new Date() } });
    const authUser = { id: seller.id, email: seller.email, name: seller.businessName, role: 'SELLER' as const };
    return res.json({ token: signToken(authUser), user: { ...authUser, phone: seller.contactPhone, district: seller.district } });
  }

  const user = await prisma.platformUser.findUnique({ where: { email } });
  if (user && (await bcrypt.compare(password, user.passwordHash))) {
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'This account has been suspended. Contact support.' });
    }
    await prisma.platformUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const authUser = { id: user.id, email: user.email, name: user.name, role: 'USER' as const };
    return res.json({ token: signToken(authUser), user: authUser });
  }

  return res.status(401).json({ error: 'Incorrect email or password.' });
});

/**
 * Who the caller actually is, right now.
 *
 * This used to answer `req.user` - the decoded JWT - which is only a record of
 * who they were when they signed in. Tokens last 7 days, so that answer stayed
 * "Administrator" for a week after the account was deleted, demoted or
 * suspended, and stayed stale for a Sub-Administrator whose permissions were
 * changed that morning. Every route already re-reads permissions from the
 * database on each request (see hasModulePermission); this endpoint is what
 * lets the client's own idea of the user keep up with them.
 *
 * A row that has gone away, or an account since suspended, is a 401 - the
 * client treats that exactly like an expired token and signs the person out.
 */
authRouter.get('/me', requireAuth, async (req, res) => {
  const claim = req.user!;
  const gone = () => res.status(401).json({ error: 'This session is no longer valid. Please sign in again.' });

  if (claim.role === 'ADMINISTRATOR') {
    const admin = await prisma.administrator.findUnique({ where: { id: claim.id } });
    if (!admin) return gone();
    return res.json({
      user: { id: admin.id, email: admin.email, name: admin.name, role: 'ADMINISTRATOR', permissions: fullPermissions() },
    });
  }

  if (claim.role === 'SUB_ADMINISTRATOR') {
    const subAdmin = await prisma.subAdministrator.findUnique({ where: { id: claim.id } });
    if (!subAdmin) return gone();
    let modules: string[] = [];
    try {
      modules = JSON.parse(subAdmin.permissions || '[]');
    } catch {
      modules = [];
    }
    return res.json({
      user: {
        id: subAdmin.id,
        email: subAdmin.email,
        name: subAdmin.name,
        role: 'SUB_ADMINISTRATOR',
        permissions: permissionsFromModuleList(modules),
      },
    });
  }

  if (claim.role === 'SELLER') {
    const seller = await prisma.seller.findUnique({ where: { id: claim.id } });
    if (!seller || seller.status === 'SUSPENDED') return gone();
    return res.json({
      user: {
        id: seller.id,
        email: seller.email,
        name: seller.businessName,
        role: 'SELLER',
        phone: seller.contactPhone,
        district: seller.district,
      },
    });
  }

  const user = await prisma.platformUser.findUnique({ where: { id: claim.id } });
  if (!user || user.status === 'SUSPENDED') return gone();
  return res.json({ user: { id: user.id, email: user.email, name: user.name, role: 'USER' } });
});
