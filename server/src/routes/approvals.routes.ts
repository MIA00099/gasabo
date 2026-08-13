import { Router } from 'express';
import { prisma } from '../config/db.js';
import { requireAuth, requireRole, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { notifyAdmins } from '../utils/notify.js';
import { isEmailTaken } from '../utils/accountEmail.js';

export const approvalsRouter = Router();

approvalsRouter.get('/', requireAuth, requireRole('ADMINISTRATOR', 'SUB_ADMINISTRATOR'), async (_req, res) => {
  const requests = await prisma.approvalRequest.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ requests });
});

async function executeApprovedAction(req: {
  actionType: string;
  targetId: string | null;
  targetName: string;
  newPermissions: string | null;
  pendingEmail: string | null;
  pendingPasswordHash: string | null;
  requestedById: string;
}) {
  if (req.actionType === 'CREATE_SUB_ADMIN') {
    if (!req.pendingEmail || !req.pendingPasswordHash) {
      throw new Error('This request predates the create-account approval flow and has no account details recorded.');
    }
    // Re-checked here, not just at request time - the email could have been
    // taken by a different account in the time between the request being
    // filed and a second Administrator approving it.
    if (await isEmailTaken(req.pendingEmail)) {
      throw new Error('An account with this email now exists - it may have been created another way since this request was made.');
    }
    const subAdmin = await prisma.subAdministrator.create({
      data: {
        name: req.targetName,
        email: req.pendingEmail,
        passwordHash: req.pendingPasswordHash,
        permissions: req.newPermissions ?? '[]',
        createdById: req.requestedById,
      },
    });
    const applied = JSON.parse(req.newPermissions || '[]');
    return `Sub-Administrator account created for ${subAdmin.name} with permissions: ${applied.length ? applied.join(', ') : '(none)'}.`;
  }
  if (req.actionType === 'DELETE_SELLER_ACCOUNT' && req.targetId) {
    await prisma.seller.delete({ where: { id: req.targetId } }).catch(() => {
      throw new Error('Seller could not be deleted (it may already be removed).');
    });
    return 'Seller account and all listed products removed.';
  }
  if (req.actionType === 'DELETE_CATEGORY' && req.targetId) {
    const productsUsingCategory = await prisma.product.count({ where: { categoryId: req.targetId } });
    if (productsUsingCategory > 0) {
      throw new Error(
        `Category still has ${productsUsingCategory} product(s) listed under it. Reassign or remove those products before it can be deleted.`
      );
    }
    await prisma.category.delete({ where: { id: req.targetId } });
    return 'Category deleted.';
  }
  if (req.actionType === 'CHANGE_ADMIN_PERMISSIONS' && req.targetId) {
    if (req.newPermissions === null) {
      throw new Error('This request predates permission-diff tracking and has no recorded permission set to apply.');
    }
    const target = await prisma.subAdministrator.update({
      where: { id: req.targetId },
      data: { permissions: req.newPermissions },
    }).catch(() => {
      throw new Error('Sub-Administrator not found (they may have been removed since this request was made).');
    });
    const applied = JSON.parse(req.newPermissions || '[]');
    return `Permissions updated for ${target.name}: ${applied.length ? applied.join(', ') : '(all access revoked)'}.`;
  }
  if (req.actionType === 'DELETE_SUB_ADMIN' && req.targetId) {
    const target = await prisma.subAdministrator.delete({ where: { id: req.targetId } }).catch(() => {
      throw new Error('Sub-Administrator could not be deleted (they may already be removed).');
    });
    return `Sub-Administrator account removed: ${target.name}.`;
  }
  return 'Action type recognized, no further automation required.';
}

// Approving and executing a critical action requires either full Administrator
// clearance, or a Sub-Administrator who's been granted the dedicated APPROVALS
// permission (a scoped "approver-only" account - see rbac.routes.ts). Ordinary
// Sub-Administrators without that permission can still request or reject, but
// can't be the second approver - requirePermission('APPROVALS') already
// resolves to true for full Administrators unconditionally (see
// hasModulePermission in middleware/auth.ts), so this one check covers both.
approvalsRouter.post('/:id/approve', requireAuth, requirePermission('APPROVALS'), async (req, res) => {
  const request = await prisma.approvalRequest.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: 'Approval request not found.' });
  if (request.status !== 'PENDING') return res.status(409).json({ error: 'This request has already been resolved.' });

  // This is the entire point of "dual authorization": the administrator who
  // requested a critical action must not also be the one who approves it.
  // Without this check, requireRole('ADMINISTRATOR') alone lets a single admin
  // request and immediately approve their own request, defeating the control.
  if (request.requestedById === req.user!.id) {
    return res.status(403).json({ error: 'You requested this action - a different administrator must approve it.' });
  }

  let outcomeNote = '';
  try {
    outcomeNote = await executeApprovedAction(request);
  } catch (e: any) {
    return res.status(422).json({ error: e.message || 'Could not execute the approved action.' });
  }

  const updated = await prisma.approvalRequest.update({
    where: { id: request.id },
    data: {
      status: 'APPROVED',
      approvedByName: req.user!.name,
      approvalDate: new Date(),
      note: outcomeNote,
    },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'CRITICAL_ACTION_APPROVED',
    module: 'Multi-Admin Approvals',
    targetId: request.id,
    details: `Approved & executed request ${request.id} (${request.actionType}). ${outcomeNote}`,
  });

  await notifyAdmins({
    type: 'APPROVAL_REQUEST_RESOLVED',
    recipientId: request.requestedById,
    message: `Your request to ${request.targetName} was approved by ${req.user!.name}. ${outcomeNote}`,
  });

  res.json({ request: updated });
});

approvalsRouter.post('/:id/reject', requireAuth, requireRole('ADMINISTRATOR', 'SUB_ADMINISTRATOR'), async (req, res) => {
  const request = await prisma.approvalRequest.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: 'Approval request not found.' });
  if (request.status !== 'PENDING') return res.status(409).json({ error: 'This request has already been resolved.' });

  const updated = await prisma.approvalRequest.update({
    where: { id: request.id },
    data: {
      status: 'REJECTED',
      rejectedByName: req.user!.name,
      rejectionDate: new Date(),
      note: req.body?.note || '',
    },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'CRITICAL_ACTION_REJECTED',
    module: 'Multi-Admin Approvals',
    targetId: request.id,
    details: `Rejected request ${request.id}.`,
  });

  await notifyAdmins({
    type: 'APPROVAL_REQUEST_RESOLVED',
    recipientId: request.requestedById,
    message: `Your request to ${request.targetName} was rejected by ${req.user!.name}.${req.body?.note ? ' Reason: ' + req.body.note : ''}`,
  });

  res.json({ request: updated });
});
