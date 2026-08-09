import { Router } from 'express';
import { prisma } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { fullPermissions, permissionsFromModuleList } from '../utils/permissions.js';
import { logAudit } from '../utils/audit.js';

export const rbacRouter = Router();

rbacRouter.get('/users', requireAuth, requireRole('ADMINISTRATOR', 'SUB_ADMINISTRATOR'), async (_req, res) => {
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

const VALID_MODULES = ['PRODUCTS', 'SELLERS', 'CATEGORIES', 'ADVERTISEMENTS', 'REAL_ESTATE_CONTENT', 'REPORTS', 'USERS', 'SYSTEM_SETTINGS'];

rbacRouter.post('/users/:id/request-permission-change', requireAuth, requireRole('ADMINISTRATOR', 'SUB_ADMINISTRATOR'), async (req, res) => {
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

  res.status(201).json({ request });
});
