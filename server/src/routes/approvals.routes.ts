import { Router } from 'express';
import { prisma } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

export const approvalsRouter = Router();

approvalsRouter.get('/', requireAuth, requireRole('ADMINISTRATOR', 'SUB_ADMINISTRATOR'), async (_req, res) => {
  const requests = await prisma.approvalRequest.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ requests });
});

async function executeApprovedAction(req: { actionType: string; targetId: string | null }) {
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
  if (req.actionType === 'CHANGE_ADMIN_PERMISSIONS') {
    return 'Permission change acknowledged (no automated permission diff was attached to this request).';
  }
  return 'Action type recognized, no further automation required.';
}

// Approving and executing a critical action requires full Administrator clearance -
// a Sub-Administrator can request or reject, but cannot be the second approver.
approvalsRouter.post('/:id/approve', requireAuth, requireRole('ADMINISTRATOR'), async (req, res) => {
  const request = await prisma.approvalRequest.findUnique({ where: { id: req.params.id } });
  if (!request) return res.status(404).json({ error: 'Approval request not found.' });
  if (request.status !== 'PENDING') return res.status(409).json({ error: 'This request has already been resolved.' });

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

  res.json({ request: updated });
});
