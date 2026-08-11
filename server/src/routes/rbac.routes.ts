import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { requireAuth, requireRole, requirePermission } from '../middleware/auth.js';
import { fullPermissions, permissionsFromModuleList } from '../utils/permissions.js';
import { logAudit } from '../utils/audit.js';
import { isEmailTaken } from '../utils/accountEmail.js';
import { notifyAdmins } from '../utils/notify.js';

export const rbacRouter = Router();

rbacRouter.get('/users', requireAuth, requirePermission('USERS'), async (_req, res) => {
  const [admins, subAdmins] = await Promise.all([
    prisma.administrator.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.subAdministrator.findMany({ orderBy: { createdAt: 'asc' } }),
  ]);

  const users = [
    ...admins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      role: 'administrator',
      district: 'Gasabo',
      lastLogin: a.lastLoginAt,
      permissions: fullPermissions(),
    })),
    ...subAdmins.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: 'sub_administrator',
      district: 'Gasabo',
      lastLogin: s.lastLoginAt,
      permissions: permissionsFromModuleList(JSON.parse(s.permissions || '[]')),
    })),
  ];

  res.json({ users });
});

const VALID_MODULES = ['PRODUCTS', 'SELLERS', 'CATEGORIES', 'ADVERTISEMENTS', 'REAL_ESTATE_CONTENT', 'REPORTS', 'USERS', 'SYSTEM_SETTINGS', 'APPROVALS'];

const createSubAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  permissions: z.array(z.string()).optional(),
});

// SubAdministrator.createdById is a required FK to Administrator (see
// schema.prisma) - a Sub-Administrator creating another Sub-Administrator
// isn't representable in the data model, so this is Administrator-only,
// not the usual requireRole('ADMINISTRATOR', 'SUB_ADMINISTRATOR') pair.
rbacRouter.post('/sub-admins', requireAuth, requireRole('ADMINISTRATOR'), async (req, res) => {
  const parsed = createSubAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please fill in all fields correctly (name, email, password min. 6 characters).', details: parsed.error.flatten() });
  }
  const { name, email, password } = parsed.data;
  const permissions = (parsed.data.permissions || []).filter((m) => VALID_MODULES.includes(m));

  if (await isEmailTaken(email)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const subAdmin = await prisma.subAdministrator.create({
    data: { name, email, passwordHash, permissions: JSON.stringify(permissions), createdById: req.user!.id },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'SUB_ADMIN_CREATED',
    module: 'User RBAC',
    targetId: subAdmin.id,
    details: `Created Sub-Administrator account for ${name} (${email}) with permissions: ${permissions.join(', ') || '(none)'}.`,
  });

  res.status(201).json({
    user: {
      id: subAdmin.id,
      name: subAdmin.name,
      email: subAdmin.email,
      role: 'sub_administrator',
      district: 'Gasabo',
      lastLogin: subAdmin.lastLoginAt,
      permissions: permissionsFromModuleList(permissions),
    },
  });
});

const createAdministratorSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

// The dual-authorization approval flow (see approvals.routes.ts) requires a
// SECOND Administrator to approve critical actions - self-approval is
// blocked, and Sub-Administrators can reject but not approve. With only one
// Administrator account ever existing (the seeded one), every critical
// request - including a permission grant for a Sub-Administrator - would be
// permanently stuck PENDING with no one able to approve it. This endpoint is
// what actually breaks that deadlock.
rbacRouter.post('/administrators', requireAuth, requireRole('ADMINISTRATOR'), async (req, res) => {
  const parsed = createAdministratorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please fill in all fields correctly (name, email, password min. 6 characters).', details: parsed.error.flatten() });
  }
  const { name, email, password } = parsed.data;

  if (await isEmailTaken(email)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.administrator.create({
    data: { name, email, passwordHash, role: 'ADMINISTRATOR' },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'ADMINISTRATOR_CREATED',
    module: 'User RBAC',
    targetId: admin.id,
    details: `Created a second Administrator account for ${name} (${email}).`,
  });

  res.status(201).json({
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: 'administrator',
      district: 'Gasabo',
      lastLogin: admin.lastLoginAt,
      permissions: fullPermissions(),
    },
  });
});

rbacRouter.post('/sub-admins/:id/reset-password', requireAuth, requirePermission('USERS'), async (req, res) => {
  const target = await prisma.subAdministrator.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'Sub-Administrator not found.' });

  // Same pattern as sellers.routes.ts's reset-password - in production this
  // would email a reset link instead of returning a temp password directly.
  const tempPassword = Math.random().toString(36).slice(-10);
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.subAdministrator.update({ where: { id: target.id }, data: { passwordHash } });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'SUB_ADMIN_PASSWORD_RESET',
    module: 'User RBAC',
    targetId: target.id,
    details: `Reset password for Sub-Administrator ${target.name}.`,
  });

  res.json({ success: true, tempPassword });
});

const changeEmailSchema = z.object({ email: z.string().email() });

rbacRouter.post('/sub-admins/:id/change-email', requireAuth, requireRole('ADMINISTRATOR'), async (req, res) => {
  const parsed = changeEmailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A valid email address is required.' });

  const target = await prisma.subAdministrator.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'Sub-Administrator not found.' });

  if (parsed.data.email !== target.email && (await isEmailTaken(parsed.data.email, target.id, 'subAdmin'))) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const oldEmail = target.email;
  const updated = await prisma.subAdministrator.update({ where: { id: target.id }, data: { email: parsed.data.email } });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'SUB_ADMIN_EMAIL_CHANGED',
    module: 'User RBAC',
    targetId: target.id,
    details: `Changed email for ${target.name} from ${oldEmail} to ${updated.email}.`,
  });

  res.json({ email: updated.email });
});

// Removing a Sub-Administrator's access entirely is at least as sensitive as
// changing their permissions (which already goes through approval above) -
// same dual-authorization workflow, not a direct delete like a product.
rbacRouter.post('/sub-admins/:id/request-delete', requireAuth, requirePermission('USERS'), async (req, res) => {
  const target = await prisma.subAdministrator.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'Sub-Administrator not found.' });

  const request = await prisma.approvalRequest.create({
    data: {
      actionType: 'DELETE_SUB_ADMIN',
      targetName: `Sub-Administrator: ${target.name} (ID: ${target.id})`,
      targetId: target.id,
      requestedById: req.user!.id,
      requestedByName: req.user!.name,
      requestedByEmail: req.user!.email,
      reason: req.body?.reason || 'Sub-Administrator account removal requested.',
      riskLevel: 'HIGH',
    },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'CRITICAL_APPROVAL_REQUESTED',
    module: 'Multi-Admin Approvals',
    targetId: request.id,
    details: `Created approval request ${request.id} to remove Sub-Administrator "${target.name}".`,
  });

  await notifyAdmins({
    type: 'APPROVAL_REQUEST_CREATED',
    message: `${req.user!.name} requested removal of Sub-Administrator "${target.name}" - needs a second Administrator's approval.`,
  });

  res.status(201).json({ request });
});

rbacRouter.post('/users/:id/request-permission-change', requireAuth, requirePermission('USERS'), async (req, res) => {
  // Only Sub-Administrators have an editable permissions field - a full
  // Administrator's permissions are hardcoded to "everything" (see
  // fullPermissions() in utils/permissions.ts) and can't be reduced, so
  // there's nothing for an approved request to actually change for one.
  const target = await prisma.subAdministrator.findUnique({ where: { id: req.params.id } });
  if (!target) {
    return res.status(400).json({ error: 'Only Sub-Administrator permissions can be changed - Administrators always have full access.' });
  }

  const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions.filter((m: string) => VALID_MODULES.includes(m)) : [];
  const targetName = req.body?.targetName || target.name;

  const request = await prisma.approvalRequest.create({
    data: {
      actionType: 'CHANGE_ADMIN_PERMISSIONS',
      targetName: `Sub-Administrator: ${targetName}`,
      targetId: req.params.id,
      requestedById: req.user!.id,
      requestedByName: req.user!.name,
      requestedByEmail: req.user!.email,
      reason: req.body?.reason || `Requesting new permission set: ${permissions.join(', ') || '(none - revoke all)'}.`,
      newPermissions: JSON.stringify(permissions),
      riskLevel: 'HIGH',
    },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'CRITICAL_APPROVAL_REQUESTED',
    module: 'Multi-Admin Approvals',
    targetId: request.id,
    details: `Created approval request ${request.id} to change permissions for ${targetName}.`,
  });

  await notifyAdmins({
    type: 'APPROVAL_REQUEST_CREATED',
    message: `${req.user!.name} requested a permission change for "${targetName}" - needs a second Administrator's approval.`,
  });

  res.status(201).json({ request });
});
