import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { fullPermissions, permissionsFromModuleList } from '../utils/permissions.js';
import { logAudit } from '../utils/audit.js';
import { notifyAdminsWithModulePermission } from '../utils/notify.js';

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

const forgotPasswordSchema = z.object({ email: z.string().email() });

// The same answer whichever way it goes. Saying "no account with that email"
// would turn this into a way to find out who has one.
const FORGOT_PASSWORD_REPLY =
  "If that email belongs to a seller account, we've passed the request to our team. " +
  'They will send you a temporary password shortly - check back, or call 0788350555 if it is urgent.';

/**
 * "Forgot password?" on the sign-in screen.
 *
 * That link was an <a href="#"> with no handler bound to it at all: it moved
 * the page a few pixels and did nothing else, so a seller locked out of their
 * account had no route back in short of phoning someone.
 *
 * It cannot email a reset link, because nothing in this app sends email -
 * utils/notify.ts writes Notification rows, and utils/accountEmail.ts only
 * checks address uniqueness. So this closes the loop that does exist: it
 * raises the request with the administrators who hold the SELLERS module, who
 * reset the password from Seller Management (POST /sellers/:id/reset-password)
 * and pass the temporary one to the seller.
 *
 * Public by design - the caller is locked out, so requiring auth would defeat
 * the point. Sellers only: administrators and sub-administrators are reset by
 * another administrator through the RBAC screen, and platform users have no
 * password-reset path yet.
 */
authRouter.post('/forgot-password', async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter the email address on your account.' });
  }
  // Not lower-cased or otherwise normalised: login matches the stored address
  // exactly (see /login above), so normalising here would find accounts that
  // then could not sign in with the address they typed.
  const { email } = parsed.data;

  const seller = await prisma.seller.findUnique({ where: { email } });

  if (seller && seller.status !== 'SUSPENDED') {
    // This endpoint is public, so without a guard anyone could pile up
    // notification rows by submitting the same address repeatedly. One open
    // request per seller is all an administrator needs to act on.
    const alreadyPending = await prisma.notification.findFirst({
      where: { type: 'PASSWORD_RESET_REQUEST', isRead: false, message: { contains: seller.email } },
    });

    if (!alreadyPending) {
      await notifyAdminsWithModulePermission('SELLERS', {
        type: 'PASSWORD_RESET_REQUEST',
        message: `${seller.businessName} (${seller.email}) forgot their password and asked for a reset. Use Reset Password in Seller Management, then pass the temporary password on.`,
      });

      await logAudit({
        actorId: seller.id,
        actorType: 'SELLER',
        actorName: seller.businessName,
        action: 'PASSWORD_RESET_REQUESTED',
        module: 'Security & Auth',
        targetId: seller.id,
        details: `${seller.businessName} requested a password reset from the sign-in screen.`,
      });
    }
  }

  res.json({ success: true, message: FORGOT_PASSWORD_REPLY });
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

// The account tables, keyed by the role stored in the JWT. Every account type
// authenticates the same way (a bcrypt passwordHash column), so change-password
// works uniformly across administrators, sub-administrators, sellers and users.
const accountModelFor = (role: string): any =>
  ({
    ADMINISTRATOR: prisma.administrator,
    SUB_ADMINISTRATOR: prisma.subAdministrator,
    SELLER: prisma.seller,
    USER: prisma.platformUser,
  } as Record<string, any>)[role];

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

// Change your own password: prove the current one, then set a new one. This is
// the self-service path - distinct from an administrator RESETTING a seller's
// password (that issues a temporary one), which stays in sellers.routes.ts.
authRouter.post('/change-password', requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter your current password and a new password of at least 6 characters.' });
  }
  const { currentPassword, newPassword } = parsed.data;
  const claim = req.user!;

  const model = accountModelFor(claim.role);
  if (!model) return res.status(400).json({ error: 'This account type cannot change its password here.' });

  const account = await model.findUnique({ where: { id: claim.id } });
  if (!account) return res.status(401).json({ error: 'This session is no longer valid. Please sign in again.' });

  if (!(await bcrypt.compare(currentPassword, account.passwordHash))) {
    return res.status(400).json({ error: 'Your current password is incorrect.' });
  }
  if (await bcrypt.compare(newPassword, account.passwordHash)) {
    return res.status(400).json({ error: 'The new password must be different from your current one.' });
  }

  await model.update({ where: { id: account.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });

  await logAudit({
    actorId: claim.id,
    actorType: claim.role,
    actorName: claim.name,
    action: 'PASSWORD_CHANGED',
    module: 'Account',
    details: 'Changed their own password.',
  });

  res.json({ success: true });
});

const updateSellerProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(6).optional(),
});

// A seller editing their own storefront name and contact phone. Email is not
// self-editable (it is the login identity and is changed through the admin
// path, which audits it); status/district are not touched here.
authRouter.patch('/profile', requireAuth, async (req, res) => {
  const claim = req.user!;
  if (claim.role !== 'SELLER') {
    return res.status(403).json({ error: 'Only sellers can edit a storefront profile.' });
  }
  const parsed = updateSellerProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid business name and/or phone number.' });
  const { name, phone } = parsed.data;
  if (name === undefined && phone === undefined) return res.status(400).json({ error: 'Nothing to update.' });

  const seller = await prisma.seller.findUnique({ where: { id: claim.id } });
  if (!seller || seller.status === 'SUSPENDED') {
    return res.status(401).json({ error: 'This session is no longer valid. Please sign in again.' });
  }

  const updated = await prisma.seller.update({
    where: { id: seller.id },
    data: {
      ...(name !== undefined ? { businessName: name.trim() } : {}),
      ...(phone !== undefined ? { contactPhone: phone.trim() } : {}),
    },
  });

  await logAudit({
    actorId: claim.id,
    actorType: 'SELLER',
    actorName: updated.businessName,
    action: 'SELLER_PROFILE_UPDATED',
    module: 'Account',
    details: `Updated their own profile${name !== undefined ? ' name' : ''}${name !== undefined && phone !== undefined ? ' and' : ''}${phone !== undefined ? ' phone' : ''}.`,
  });

  res.json({
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.businessName,
      role: 'SELLER',
      phone: updated.contactPhone,
      district: updated.district,
    },
  });
});
