/**
 * Multi-Admin Approvals regression suite.
 *
 * approvals.routes.ts is where the platform's destructive operations actually
 * happen - deleting sub-administrators and sellers, removing categories,
 * rewriting permission sets, creating privileged accounts. None of it had test
 * coverage.
 *
 * The rule most worth protecting is dual authorization: the administrator who
 * REQUESTS a critical action must not be the one who approves it. It is four
 * lines in the middle of a long handler, it has no visible effect in normal
 * use, and deleting it would leave every existing test passing while quietly
 * letting a single admin request and execute their own account deletions.
 *
 * These tests assert on the resulting database state, not just status codes:
 * a guard that returns 403 *after* having already deleted something would
 * still pass a status-only assertion.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { signToken, type AuthUser } from '../src/middleware/auth.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

let requesterId: string;
let requesterToken: string;
let secondAdminToken: string;
let approverSubAdminToken: string;
let plainSubAdminToken: string;
let plainSubAdminId: string;
let adminId: string;

/** Unique suffix so each test can make its own fixtures without collisions. */
let seq = 0;
const uniq = () => `${Date.now()}-${seq++}`;

/**
 * Create a PENDING approval request attributed to `requesterId` unless told
 * otherwise. Built directly rather than through the request-raising routes so
 * these tests stay focused on the approval half; one test below still drives
 * the full request-then-approve loop over HTTP.
 */
async function pendingRequest(overrides: Record<string, unknown> = {}) {
  return prisma.approvalRequest.create({
    data: {
      actionType: 'DELETE_SUB_ADMIN',
      targetName: 'Fixture target',
      requestedById: requesterId,
      requestedByName: 'Requesting Administrator',
      requestedByEmail: 'rq-admin@test.local',
      reason: 'Fixture request.',
      ...overrides,
    },
  });
}

async function makeSubAdmin(permissions: string[] = []) {
  return prisma.subAdministrator.create({
    data: {
      email: `sub-${uniq()}@test.local`,
      passwordHash: 'not-used',
      name: `Sub ${uniq()}`,
      permissions: JSON.stringify(permissions),
      createdById: adminId,
    },
  });
}

beforeAll(async () => {
  if (process.env.ALLOW_DESTRUCTIVE_DB_TESTS !== 'yes') {
    throw new Error(
      'Refusing to wipe the database: safety guard did not run. ' +
        'Expected server/test/setup.ts to have validated an isolated test DB.',
    );
  }

  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.subAdministrator.deleteMany();
  await prisma.administrator.deleteMany();

  const requester = await prisma.administrator.create({
    data: {
      email: 'rq-admin@test.local',
      passwordHash: 'not-used',
      name: 'Requesting Administrator',
    },
  });
  requesterId = requester.id;
  adminId = requester.id;
  requesterToken = signToken({
    id: requester.id,
    email: requester.email,
    name: requester.name,
    role: 'ADMINISTRATOR',
  } satisfies AuthUser);

  const second = await prisma.administrator.create({
    data: {
      email: 'second-admin@test.local',
      passwordHash: 'not-used',
      name: 'Second Administrator',
    },
  });
  secondAdminToken = signToken({
    id: second.id,
    email: second.email,
    name: second.name,
    role: 'ADMINISTRATOR',
  } satisfies AuthUser);

  // Scoped approver: holds APPROVALS and nothing else.
  const approver = await makeSubAdmin(['APPROVALS']);
  approverSubAdminToken = signToken({
    id: approver.id,
    email: approver.email,
    name: approver.name,
    role: 'SUB_ADMINISTRATOR',
  } satisfies AuthUser);

  const plain = await makeSubAdmin(['PRODUCTS', 'SELLERS']);
  plainSubAdminId = plain.id;
  plainSubAdminToken = signToken({
    id: plain.id,
    email: plain.email,
    name: plain.name,
    role: 'SUB_ADMINISTRATOR',
  } satisfies AuthUser);
});

describe('Dual authorization', () => {
  it('BLOCKS the requester from approving their own request, and does not execute it', async () => {
    const target = await makeSubAdmin();
    const req = await pendingRequest({ actionType: 'DELETE_SUB_ADMIN', targetId: target.id });

    const res = await request(app)
      .post(`/api/approvals/${req.id}/approve`)
      .set(auth(requesterToken));

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/different administrator/i);

    // The whole point: the destructive action must not have run.
    const stillThere = await prisma.subAdministrator.findUnique({ where: { id: target.id } });
    expect(stillThere).not.toBeNull();

    // And the request stays open for someone else to resolve.
    const after = await prisma.approvalRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(after.status).toBe('PENDING');
  });

  it('allows a DIFFERENT administrator to approve, and executes the action', async () => {
    const target = await makeSubAdmin();
    const req = await pendingRequest({ actionType: 'DELETE_SUB_ADMIN', targetId: target.id });

    const res = await request(app)
      .post(`/api/approvals/${req.id}/approve`)
      .set(auth(secondAdminToken));

    expect(res.status).toBe(200);

    const gone = await prisma.subAdministrator.findUnique({ where: { id: target.id } });
    expect(gone).toBeNull();

    const after = await prisma.approvalRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(after.status).toBe('APPROVED');
    expect(after.approvedByName).toBe('Second Administrator');
    expect(after.approvalDate).not.toBeNull();
  });

  it('still lets the requester REJECT their own request (withdrawing is not self-approval)', async () => {
    const target = await makeSubAdmin();
    const req = await pendingRequest({ actionType: 'DELETE_SUB_ADMIN', targetId: target.id });

    const res = await request(app)
      .post(`/api/approvals/${req.id}/reject`)
      .set(auth(requesterToken))
      .send({ note: 'Changed my mind.' });

    expect(res.status).toBe(200);

    const after = await prisma.approvalRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(after.status).toBe('REJECTED');

    // Rejecting must never execute the action either.
    const stillThere = await prisma.subAdministrator.findUnique({ where: { id: target.id } });
    expect(stillThere).not.toBeNull();
  });
});

describe('Who may approve', () => {
  it('rejects unauthenticated callers with 401', async () => {
    const req = await pendingRequest();
    const res = await request(app).post(`/api/approvals/${req.id}/approve`);
    expect(res.status).toBe(401);
  });

  it('denies a sub-administrator without the APPROVALS permission', async () => {
    const req = await pendingRequest();

    const res = await request(app)
      .post(`/api/approvals/${req.id}/approve`)
      .set(auth(plainSubAdminToken));

    expect(res.status).toBe(403);

    const after = await prisma.approvalRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(after.status).toBe('PENDING');
  });

  it('lets a scoped sub-administrator holding APPROVALS act as the second approver', async () => {
    const target = await makeSubAdmin();
    const req = await pendingRequest({ actionType: 'DELETE_SUB_ADMIN', targetId: target.id });

    const res = await request(app)
      .post(`/api/approvals/${req.id}/approve`)
      .set(auth(approverSubAdminToken));

    expect(res.status).toBe(200);
    expect(await prisma.subAdministrator.findUnique({ where: { id: target.id } })).toBeNull();
  });

  it('hides other people approval requests from a sub-administrator without APPROVALS', async () => {
    const someoneElses = await pendingRequest({ targetName: 'Not yours' });
    const own = await pendingRequest({
      requestedById: plainSubAdminId,
      requestedByName: 'Plain Sub',
      requestedByEmail: 'plain-sub@test.local',
      targetName: 'Yours',
    });

    const res = await request(app)
      .get('/api/approvals')
      .set(auth(plainSubAdminToken));

    expect(res.status).toBe(200);
    const ids = res.body.requests.map((r: { id: string }) => r.id);
    expect(ids).toContain(own.id);
    expect(ids).not.toContain(someoneElses.id);
  });

  it('denies a sub-administrator without APPROVALS from rejecting someone else request', async () => {
    const req = await pendingRequest();

    const res = await request(app)
      .post(`/api/approvals/${req.id}/reject`)
      .set(auth(plainSubAdminToken))
      .send({ note: 'Nope.' });

    expect(res.status).toBe(403);
    const after = await prisma.approvalRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(after.status).toBe('PENDING');
  });

  it('still lets a sub-administrator withdraw their own pending request', async () => {
    const req = await pendingRequest({
      requestedById: plainSubAdminId,
      requestedByName: 'Plain Sub',
      requestedByEmail: 'plain-sub@test.local',
    });

    const res = await request(app)
      .post(`/api/approvals/${req.id}/reject`)
      .set(auth(plainSubAdminToken))
      .send({ note: 'Withdrawn.' });

    expect(res.status).toBe(200);
    const after = await prisma.approvalRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(after.status).toBe('REJECTED');
  });
});

describe('Request lifecycle guards', () => {
  it('returns 404 for an unknown request', async () => {
    const res = await request(app)
      .post('/api/approvals/00000000-0000-0000-0000-000000000000/approve')
      .set(auth(secondAdminToken));

    expect(res.status).toBe(404);
  });

  it('refuses to approve a request that was already resolved', async () => {
    const target = await makeSubAdmin();
    const req = await pendingRequest({ actionType: 'DELETE_SUB_ADMIN', targetId: target.id });

    await request(app).post(`/api/approvals/${req.id}/approve`).set(auth(secondAdminToken));
    const second = await request(app)
      .post(`/api/approvals/${req.id}/approve`)
      .set(auth(secondAdminToken));

    expect(second.status).toBe(409);
  });

  it('refuses to reject a request that was already resolved', async () => {
    const req = await pendingRequest();

    await request(app).post(`/api/approvals/${req.id}/reject`).set(auth(secondAdminToken)).send({});
    const second = await request(app)
      .post(`/api/approvals/${req.id}/reject`)
      .set(auth(secondAdminToken))
      .send({});

    expect(second.status).toBe(409);
  });
});

describe('Executing the approved action', () => {
  it('applies a permission change', async () => {
    const target = await makeSubAdmin(['PRODUCTS']);
    const req = await pendingRequest({
      actionType: 'CHANGE_ADMIN_PERMISSIONS',
      targetId: target.id,
      newPermissions: JSON.stringify(['PRODUCTS', 'SELLERS', 'APPROVALS']),
    });

    const res = await request(app)
      .post(`/api/approvals/${req.id}/approve`)
      .set(auth(secondAdminToken));

    expect(res.status).toBe(200);

    const after = await prisma.subAdministrator.findUniqueOrThrow({ where: { id: target.id } });
    expect(JSON.parse(after.permissions)).toEqual(['PRODUCTS', 'SELLERS', 'APPROVALS']);
  });

  it('creates the sub-administrator account for a CREATE_SUB_ADMIN request', async () => {
    const email = `created-${uniq()}@test.local`;
    const req = await pendingRequest({
      actionType: 'CREATE_SUB_ADMIN',
      targetName: 'Freshly Created Sub-Admin',
      pendingEmail: email,
      pendingPasswordHash: 'pre-hashed-value',
      newPermissions: JSON.stringify(['CATEGORIES']),
    });

    const res = await request(app)
      .post(`/api/approvals/${req.id}/approve`)
      .set(auth(secondAdminToken));

    expect(res.status).toBe(200);

    const created = await prisma.subAdministrator.findUnique({ where: { email } });
    expect(created).not.toBeNull();
    expect(JSON.parse(created!.permissions)).toEqual(['CATEGORIES']);
  });

  it('refuses CREATE_SUB_ADMIN if the email was claimed after the request was raised', async () => {
    const email = `raced-${uniq()}@test.local`;
    const req = await pendingRequest({
      actionType: 'CREATE_SUB_ADMIN',
      targetName: 'Loser of the race',
      pendingEmail: email,
      pendingPasswordHash: 'pre-hashed-value',
      newPermissions: JSON.stringify([]),
    });

    // Someone takes the address in the meantime.
    await prisma.subAdministrator.create({
      data: {
        email,
        passwordHash: 'not-used',
        name: 'Winner of the race',
        permissions: '[]',
        createdById: adminId,
      },
    });

    const res = await request(app)
      .post(`/api/approvals/${req.id}/approve`)
      .set(auth(secondAdminToken));

    expect(res.status).toBe(422);
  });

  it('refuses to delete a category that still has products, leaving the request retryable', async () => {
    const category = await prisma.category.create({
      data: { name: `Cat ${uniq()}`, slug: `cat-${uniq()}` },
    });
    const seller = await prisma.seller.create({
      data: {
        email: `seller-${uniq()}@test.local`,
        passwordHash: 'not-used',
        businessName: 'Fixture Seller',
        contactPhone: '+250780000001',
      },
    });
    const product = await prisma.product.create({
      data: {
        title: `Blocking product ${uniq()}`,
        description: 'Keeps the category alive.',
        price: 500,
        sellerId: seller.id,
        categoryId: category.id,
      },
    });

    const req = await pendingRequest({ actionType: 'DELETE_CATEGORY', targetId: category.id });

    const blocked = await request(app)
      .post(`/api/approvals/${req.id}/approve`)
      .set(auth(secondAdminToken));

    expect(blocked.status).toBe(422);
    expect(await prisma.category.findUnique({ where: { id: category.id } })).not.toBeNull();

    // Execution failed before the status was written, so the request is still
    // open and can be approved again once the blocker is cleared.
    const midway = await prisma.approvalRequest.findUniqueOrThrow({ where: { id: req.id } });
    expect(midway.status).toBe('PENDING');

    await prisma.product.delete({ where: { id: product.id } });

    const retried = await request(app)
      .post(`/api/approvals/${req.id}/approve`)
      .set(auth(secondAdminToken));

    expect(retried.status).toBe(200);
    expect(await prisma.category.findUnique({ where: { id: category.id } })).toBeNull();
  });
});

describe('End to end over HTTP', () => {
  it('raises a deletion request and resolves it with a second administrator', async () => {
    const target = await makeSubAdmin();

    // Requester raises it through the real endpoint.
    const raised = await request(app)
      .post(`/api/rbac/sub-admins/${target.id}/request-delete`)
      .set(auth(requesterToken))
      .send({ reason: 'Left the organisation.' });

    expect(raised.status).toBe(201);
    const requestId = raised.body.request.id;

    // The requester cannot rubber-stamp it.
    const selfApprove = await request(app)
      .post(`/api/approvals/${requestId}/approve`)
      .set(auth(requesterToken));
    expect(selfApprove.status).toBe(403);
    expect(await prisma.subAdministrator.findUnique({ where: { id: target.id } })).not.toBeNull();

    // A second administrator can.
    const approved = await request(app)
      .post(`/api/approvals/${requestId}/approve`)
      .set(auth(secondAdminToken));
    expect(approved.status).toBe(200);
    expect(await prisma.subAdministrator.findUnique({ where: { id: target.id } })).toBeNull();
  });
});
