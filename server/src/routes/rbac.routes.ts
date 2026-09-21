import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { requireAuth, requireRole, requirePermission } from '../middleware/auth.js';
import { fullPermissions, permissionsFromModuleList } from '../utils/permissions.js';
import { logAudit } from '../utils/audit.js';
import { isEmailTaken } from '../utils/accountEmail.js';
import { notifyAdmins } from '../utils/notify.js';
import { generateTemporaryPassword } from '../utils/passwords.js';

export const rbacRouter = Router();

function serializeSubAdministrator(s: {
  id: string;
  name: string;
  email: string;
  permissions: string;
  status: string;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
}) {
  let modules: string[] = [];
  try {
    modules = JSON.parse(s.permissions || '[]');
  } catch {
    modules = [];
  }
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    role: 'sub_administrator',
    district: 'Gasabo',
    lastLogin: s.lastLoginAt,
    status: s.status.toLowerCase(),
    mustChangePassword: s.mustChangePassword,
    permissions: permissionsFromModuleList(modules),
  };
}

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
    ...subAdmins.map(serializeSubAdministrator),
  ];

  res.json({ users });
});

const VALID_MODULES = ['PRODUCTS', 'SELLERS', 'CATEGORIES', 'ADVERTISEMENTS', 'REAL_ESTATE_CONTENT', 'REPORTS', 'USERS', 'SYSTEM_SETTINGS', 'APPROVALS', 'PRODUCT_APPROVAL'];

const createSubAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  permissions: z.array(z.string()).optional(),
});

// Sub-Administrator creation used to happen instantly, unilaterally, by
// whichever Administrator clicked the button - only the PERMISSIONS
// attached afterward went through Multi-Admin Approvals. By request, the
// account's existence itself is now gated the same way: this creates an
// ApprovalRequest (actionType CREATE_SUB_ADMIN) holding everything needed
// to create the account, and nothing is written to SubAdministrator until
// a *different* Administrator approves it (see executeApprovedAction in
// approvals.routes.ts). The password is hashed here, immediately - never
// held in plaintext, not even for the length of the pending request.
//
// Administrator-only for the same reason account creation always was:
// SubAdministrator.createdById is a required FK to Administrator, so a
// Sub-Administrator requesting one isn't representable in the data model.
rbacRouter.post('/sub-admins/request-create', requireAuth, requireRole('ADMINISTRATOR'), async (req, res) => {
  const parsed = createSubAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please fill in all fields correctly (name, email, password min. 6 characters).', details: parsed.error.flatten() });
  }
  const { name, email, password } = parsed.data;
  const permissions = (parsed.data.permissions || []).filter((m) => VALID_MODULES.includes(m));

  if (await isEmailTaken(email)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const pendingPasswordHash = await bcrypt.hash(password, 10);
  const request = await prisma.approvalRequest.create({
    data: {
      actionType: 'CREATE_SUB_ADMIN',
      targetName: name,
      requestedById: req.user!.id,
      requestedByName: req.user!.name,
      requestedByEmail: req.user!.email,
      reason: req.body?.reason || `Requesting a new Sub-Administrator account for ${name} (${email}) with permissions: ${permissions.join(', ') || '(none)'}.`,
      newPermissions: JSON.stringify(permissions),
      pendingEmail: email,
      pendingPasswordHash,
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
    details: `Created approval request ${request.id} to create a new Sub-Administrator account for ${name}.`,
  });

  await notifyAdmins({
    type: 'APPROVAL_REQUEST_CREATED',
    message: `${req.user!.name} requested a new Sub-Administrator account for "${name}" - needs a second Administrator's approval.`,
  });

  res.status(201).json({ request });
});

// Full Administrator is the central all-access account. Do not mint more of
// them through the UI/API.
rbacRouter.post('/administrators', requireAuth, requireRole('ADMINISTRATOR'), async (_req, res) => {
  res.status(410).json({ error: 'Creating additional full Administrators is disabled. Use the fixed approval account for secondary approval.' });
});

// The approval account is intentionally fixed to one SubAdministrator row,
// managed by seed/deployment and by the reset/change controls. No API consumer
// should create additional approval-only accounts.
rbacRouter.post('/approval-admins', requireAuth, requireRole('ADMINISTRATOR'), async (_req, res) => {
  res.status(410).json({ error: 'The approval account is fixed. Keep exactly one approval account and manage it from User RBAC.' });
});

// Emergency password reset is intentionally held by the central full
// Administrator only. Sub-Administrators with User Mgmt can request RBAC
// changes, but they cannot rotate another admin account's credentials.
rbacRouter.post('/sub-admins/:id/reset-password', requireAuth, requireRole('ADMINISTRATOR'), async (req, res) => {
  const target = await prisma.subAdministrator.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'Sub-Administrator not found.' });

  const tempPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.subAdministrator.update({
    where: { id: target.id },
    data: { passwordHash, mustChangePassword: true },
  });

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

rbacRouter.post('/sub-admins/:id/toggle-status', requireAuth, requireRole('ADMINISTRATOR'), async (req, res) => {
  const target = await prisma.subAdministrator.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'Sub-Administrator not found.' });

  const nextStatus = target.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
  const updated = await prisma.subAdministrator.update({
    where: { id: target.id },
    data: { status: nextStatus },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: nextStatus === 'SUSPENDED' ? 'SUB_ADMIN_DEACTIVATED' : 'SUB_ADMIN_REACTIVATED',
    module: 'User RBAC',
    targetId: target.id,
    details: `${nextStatus === 'SUSPENDED' ? 'Deactivated' : 'Reactivated'} Sub-Administrator ${target.name}.`,
  });

  res.json({ success: true, status: updated.status.toLowerCase() });
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

// The one central full Administrator is the account owner for admin access:
// it can remove sub-admin and approval-only accounts directly. This does not
// create another full admin or grant delete power to sub-admins.
rbacRouter.delete('/sub-admins/:id', requireAuth, requireRole('ADMINISTRATOR'), async (req, res) => {
  const target = await prisma.subAdministrator.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'Sub-Administrator not found.' });

  await prisma.subAdministrator.delete({ where: { id: target.id } });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'SUB_ADMIN_DELETED',
    module: 'User RBAC',
    targetId: target.id,
    details: `Deleted Sub-Administrator ${target.name} (${target.email}).`,
  });

  res.json({ success: true, deletedId: target.id });
});

// Sub-Administrators with USERS permission cannot delete directly. They can
// request removal for the Main Admin or approval account to review.
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
