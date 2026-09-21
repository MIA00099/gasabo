/**
 * Permission / RBAC regression suite.
 *
 * These cover the authorization rules in server/src/middleware/auth.ts, which
 * had no test coverage despite being the layer that decides who can moderate
 * listings and manage accounts. They are written against the real HTTP routes
 * (via supertest) rather than by calling the middleware directly, so a route
 * that forgets to apply a guard fails here too.
 *
 * The rule most worth protecting is the PRODUCT_APPROVAL one: it inverts the
 * usual "Administrators can do anything" behaviour and denies them. That is
 * surprising enough that a future reader could easily "fix" it into a normal
 * requirePermission() and silently hand moderation back to every admin - with
 * no failing test to stop them. Hence the explicit cases below.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { signToken, type AuthUser } from '../src/middleware/auth.js';

/** Same shape the login route mints - see server/src/routes/auth.routes.ts. */
function tokenFor(user: AuthUser): string {
  return signToken(user);
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

let adminToken: string;
let adminId: string;
let approverToken: string;
let approverId: string;
let plainSubAdminToken: string;
let sellerToken: string;
let sellerId: string;
let categoryId: string;
let suffixSeq = 0;
const suffix = () => `${Date.now()}-${suffixSeq++}`;

async function createPendingProduct(title: string): Promise<string> {
  let activeSellerId = sellerId;
  const seller = sellerId ? await prisma.seller.findUnique({ where: { id: sellerId } }) : null;
  if (!seller) {
    const newSeller = await prisma.seller.create({
      data: {
        email: `rbac-seller-${suffix()}@test.local`,
        passwordHash: 'not-used',
        businessName: 'Fixture Seller',
        contactPhone: '+250780000000',
      },
    });
    activeSellerId = newSeller.id;
    sellerId = newSeller.id;
  }

  let activeCatId = categoryId;
  const cat = categoryId ? await prisma.category.findUnique({ where: { id: categoryId } }) : null;
  if (!cat) {
    const newCat = await prisma.category.create({
      data: { name: 'RBAC Fixtures', slug: `rbac-fixtures-${suffix()}` },
    });
    activeCatId = newCat.id;
    categoryId = newCat.id;
  }

  const product = await prisma.product.create({
    data: {
      title,
      description: 'Fixture listing awaiting moderation.',
      price: 1000,
      sellerId: activeSellerId,
      categoryId: activeCatId,
      // Explicit rather than relying on the schema default, so this fixture
      // still means "awaiting moderation" if that default ever changes.
      status: 'PENDING',
    },
  });
  return product.id;
}

/** Read the products array back regardless of envelope shape. */
function productsOf(body: any): any[] {
  return Array.isArray(body) ? body : (body?.products ?? []);
}

beforeAll(async () => {
  // Defense in depth, mirroring foundations.test.ts - if the guard in
  // server/test/setup.ts is ever removed or misconfigured, refuse to wipe.
  if (process.env.ALLOW_DESTRUCTIVE_DB_TESTS !== 'yes') {
    throw new Error(
      'Refusing to wipe the database: safety guard did not run. ' +
        'Expected server/test/setup.ts to have validated an isolated test DB.',
    );
  }

  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.subAdministrator.deleteMany();
  await prisma.administrator.deleteMany();

  const admin = await prisma.administrator.create({
    data: {
      email: 'rbac-admin@test.local',
      passwordHash: 'not-used-tokens-are-minted-directly',
      name: 'Full Administrator',
    },
  });
  adminId = admin.id;
  adminToken = tokenFor({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: 'ADMINISTRATOR',
  });

  // Holds ONLY product approval - a dedicated moderator with no other access.
  const approver = await prisma.subAdministrator.create({
    data: {
      email: 'rbac-approver@test.local',
      passwordHash: 'not-used',
      name: 'Product Approver',
      permissions: JSON.stringify(['PRODUCT_APPROVAL']),
      createdById: admin.id,
    },
  });
  approverId = approver.id;
  approverToken = tokenFor({
    id: approver.id,
    email: approver.email,
    name: approver.name,
    role: 'SUB_ADMINISTRATOR',
  });

  // General marketplace sub-admin: broad access, but explicitly NOT approval.
  const plain = await prisma.subAdministrator.create({
    data: {
      email: 'rbac-subadmin@test.local',
      passwordHash: 'not-used',
      name: 'Marketplace Sub-Admin',
      permissions: JSON.stringify(['PRODUCTS', 'SELLERS', 'CATEGORIES']),
      createdById: admin.id,
    },
  });
  plainSubAdminToken = tokenFor({
    id: plain.id,
    email: plain.email,
    name: plain.name,
    role: 'SUB_ADMINISTRATOR',
  });

  const seller = await prisma.seller.create({
    data: {
      email: 'rbac-seller@test.local',
      passwordHash: 'not-used',
      businessName: 'Fixture Seller',
      contactPhone: '+250780000000',
    },
  });
  sellerId = seller.id;
  sellerToken = tokenFor({
    id: seller.id,
    email: seller.email,
    name: seller.businessName,
    role: 'SELLER',
  });

  const category = await prisma.category.create({
    data: { name: 'RBAC Fixtures', slug: 'rbac-fixtures' },
  });
  categoryId = category.id;
});

describe('PRODUCT_APPROVAL is exclusive to sub-administrators who hold it', () => {
  it('rejects unauthenticated callers with 401', async () => {
    const res = await request(app).get('/api/products/pending');
    expect(res.status).toBe(401);
  });

  it('DENIES a full Administrator - moderation is deliberately not admin access', async () => {
    const res = await request(app).get('/api/products/pending').set(auth(adminToken));

    expect(res.status).toBe(403);
    // The wording is what tells a confused admin this is intentional rather
    // than a bug, so it is worth pinning down.
    expect(res.body.error).toMatch(/Sub-Administrator/i);
  });

  it('denies a sub-administrator who lacks PRODUCT_APPROVAL', async () => {
    const res = await request(app).get('/api/products/pending').set(auth(plainSubAdminToken));
    expect(res.status).toBe(403);
  });

  it('denies a seller', async () => {
    const res = await request(app).get('/api/products/pending').set(auth(sellerToken));
    expect(res.status).toBe(403);
  });

  it('allows a sub-administrator holding PRODUCT_APPROVAL', async () => {
    const productId = await createPendingProduct('Visible in the moderation queue');

    const res = await request(app).get('/api/products/pending').set(auth(approverToken));

    expect(res.status).toBe(200);
    expect(productsOf(res.body).map((p: any) => p.id)).toContain(productId);
  });
});

describe('Approving and rejecting listings is guarded the same way', () => {
  it('DENIES a full Administrator approving a listing', async () => {
    const productId = await createPendingProduct('Admin must not approve this');

    const res = await request(app)
      .post(`/api/products/${productId}/approve`)
      .set(auth(adminToken));

    expect(res.status).toBe(403);

    // The guard must block the write, not merely the response.
    const after = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(after.status).toBe('PENDING');
  });

  it('DENIES a full Administrator rejecting a listing', async () => {
    const productId = await createPendingProduct('Admin must not reject this');

    const res = await request(app)
      .post(`/api/products/${productId}/reject`)
      .set(auth(adminToken))
      .send({ reason: 'not allowed to do this' });

    expect(res.status).toBe(403);

    const after = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(after.status).toBe('PENDING');
  });

  it('lets the approver move a listing to ACTIVE', async () => {
    const productId = await createPendingProduct('Approved listing');

    const res = await request(app)
      .post(`/api/products/${productId}/approve`)
      .set(auth(approverToken));

    expect(res.status).toBe(200);

    const after = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(after.status).toBe('ACTIVE');
    // Approval starts the 6-month listing lifecycle.
    expect(after.expiresAt).not.toBeNull();
  });

  it('refuses to re-resolve a listing that is no longer PENDING', async () => {
    const productId = await createPendingProduct('Double approval attempt');

    await request(app).post(`/api/products/${productId}/approve`).set(auth(approverToken));
    const second = await request(app)
      .post(`/api/products/${productId}/approve`)
      .set(auth(approverToken));

    expect(second.status).toBe(409);
  });

  it('records a rejection reason when the approver rejects', async () => {
    const productId = await createPendingProduct('Rejected listing');

    const res = await request(app)
      .post(`/api/products/${productId}/reject`)
      .set(auth(approverToken))
      .send({ reason: 'Images do not match the description.' });

    expect(res.status).toBe(200);

    const after = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(after.status).toBe('REJECTED');
    expect(after.rejectionReason).toBe('Images do not match the description.');
  });
});

describe('Ordinary module permissions still let Administrators through', () => {
  it('allows an Administrator with no permissions row of their own', async () => {
    // Administrators are hardcoded to "everything" rather than carrying a
    // permissions array - the opposite of the PRODUCT_APPROVAL rule above.
    const res = await request(app).get('/api/sellers').set(auth(adminToken));
    expect(res.status).toBe(200);
  });

  it('allows a sub-administrator holding the module', async () => {
    const res = await request(app).get('/api/sellers').set(auth(plainSubAdminToken));
    expect(res.status).toBe(200);
  });

  it('denies a sub-administrator who lacks the module', async () => {
    // The approver holds PRODUCT_APPROVAL only, so SELLERS must be refused.
    const res = await request(app).get('/api/sellers').set(auth(approverToken));
    expect(res.status).toBe(403);
  });
});

describe('Approval-only admins', () => {
  it('does not create another full Administrator through the old endpoint', async () => {
    const res = await request(app)
      .post('/api/rbac/administrators')
      .set(auth(adminToken))
      .send({ name: 'Second Full Admin', email: `full-admin-${suffix()}@test.local`, password: 'full-admin-secret' });

    expect(res.status).toBe(410);
    expect(res.body.error).toMatch(/fixed approval account/i);
  });

  it('does not create extra approval accounts through the API', async () => {
    const res = await request(app)
      .post('/api/rbac/approval-admins')
      .set(auth(adminToken))
      .send({ name: 'Extra Approver', email: `approval-only-${suffix()}@test.local`, password: 'approval-secret' });

    expect(res.status).toBe(410);
    expect(res.body.error).toMatch(/exactly one approval account/i);
  });

  it('keeps the fixed approval account scoped without full Administrator access', async () => {
    const approvalAccount = await prisma.subAdministrator.create({
      data: {
        email: `approval-only-${suffix()}@test.local`,
        passwordHash: 'not-used',
        name: 'Approval Only Admin',
        permissions: JSON.stringify(['APPROVALS']),
        mustChangePassword: true,
        createdById: adminId,
      },
    });
    expect(JSON.parse(approvalAccount.permissions)).toEqual(['APPROVALS']);
    expect(approvalAccount.mustChangePassword).toBe(true);

    const approvalOnlyToken = tokenFor({
      id: approvalAccount.id,
      email: approvalAccount.email,
      name: approvalAccount.name,
      role: 'SUB_ADMINISTRATOR',
    });

    const approvals = await request(app).get('/api/approvals').set(auth(approvalOnlyToken));
    expect(approvals.status).toBe(200);

    const sellers = await request(app).get('/api/sellers').set(auth(approvalOnlyToken));
    expect(sellers.status).toBe(403);
  });

  it('does not let an ordinary sub-administrator create approval-only admins', async () => {
    const res = await request(app)
      .post('/api/rbac/approval-admins')
      .set(auth(plainSubAdminToken))
      .send({ name: 'Blocked Approver', email: `blocked-approver-${suffix()}@test.local`, password: 'approval-secret' });

    expect(res.status).toBe(403);
  });

  it('lets only the full Administrator reset sub-admin passwords', async () => {
    const target = await prisma.subAdministrator.create({
      data: {
        email: `reset-target-${suffix()}@test.local`,
        passwordHash: 'not-used',
        name: 'Reset Target',
        permissions: JSON.stringify(['SELLERS']),
        createdById: adminId,
      },
    });
    const userManager = await prisma.subAdministrator.create({
      data: {
        email: `user-manager-${suffix()}@test.local`,
        passwordHash: 'not-used',
        name: 'User Manager Sub-Admin',
        permissions: JSON.stringify(['USERS']),
        createdById: adminId,
      },
    });
    const userManagerToken = tokenFor({
      id: userManager.id,
      email: userManager.email,
      name: userManager.name,
      role: 'SUB_ADMINISTRATOR',
    });

    const denied = await request(app)
      .post(`/api/rbac/sub-admins/${target.id}/reset-password`)
      .set(auth(userManagerToken));
    expect(denied.status).toBe(403);

    const reset = await request(app)
      .post(`/api/rbac/sub-admins/${target.id}/reset-password`)
      .set(auth(adminToken));
    expect(reset.status).toBe(200);
    expect(reset.body.tempPassword).toEqual(expect.any(String));

    const resetTarget = await prisma.subAdministrator.findUniqueOrThrow({ where: { id: target.id } });
    expect(resetTarget.mustChangePassword).toBe(true);

    const loginWithTemp = await request(app)
      .post('/api/auth/login')
      .send({ email: target.email, password: reset.body.tempPassword });
    expect(loginWithTemp.status).toBe(200);
    expect(loginWithTemp.body.user.mustChangePassword).toBe(true);

    const blockedByTemporaryPassword = await request(app)
      .get('/api/sellers')
      .set(auth(loginWithTemp.body.token));
    expect(blockedByTemporaryPassword.status).toBe(403);

    const ownerChange = await request(app)
      .post('/api/auth/change-password')
      .set(auth(loginWithTemp.body.token))
      .send({ currentPassword: reset.body.tempPassword, newPassword: 'owner-owned-secret' });
    expect(ownerChange.status).toBe(200);

    const changedTarget = await prisma.subAdministrator.findUniqueOrThrow({ where: { id: target.id } });
    expect(changedTarget.mustChangePassword).toBe(false);

    const allowedAfterOwnerChange = await request(app)
      .get('/api/sellers')
      .set(auth(loginWithTemp.body.token));
    expect(allowedAfterOwnerChange.status).toBe(200);
  });

  it('lets only the full Administrator deactivate and reactivate sub-admin accounts', async () => {
    const password = 'target-secret';
    const target = await prisma.subAdministrator.create({
      data: {
        email: `status-target-${suffix()}@test.local`,
        passwordHash: await bcrypt.hash(password, 10),
        name: 'Status Target',
        permissions: JSON.stringify(['SELLERS']),
        createdById: adminId,
      },
    });
    const targetToken = tokenFor({
      id: target.id,
      email: target.email,
      name: target.name,
      role: 'SUB_ADMINISTRATOR',
    });

    expect((await request(app).get('/api/sellers').set(auth(targetToken))).status).toBe(200);

    const denied = await request(app)
      .post(`/api/rbac/sub-admins/${target.id}/toggle-status`)
      .set(auth(targetToken));
    expect(denied.status).toBe(403);

    const suspended = await request(app)
      .post(`/api/rbac/sub-admins/${target.id}/toggle-status`)
      .set(auth(adminToken));
    expect(suspended.status).toBe(200);
    expect(suspended.body.status).toBe('suspended');

    expect((await request(app).get('/api/auth/me').set(auth(targetToken))).status).toBe(401);
    expect((await request(app).get('/api/sellers').set(auth(targetToken))).status).toBe(403);

    const passwordChangeBlocked = await request(app)
      .post('/api/auth/change-password')
      .set(auth(targetToken))
      .send({ currentPassword: password, newPassword: 'new-target-secret' });
    expect(passwordChangeBlocked.status).toBe(401);

    const loginBlocked = await request(app)
      .post('/api/auth/login')
      .send({ email: target.email, password });
    expect(loginBlocked.status).toBe(403);

    const active = await request(app)
      .post(`/api/rbac/sub-admins/${target.id}/toggle-status`)
      .set(auth(adminToken));
    expect(active.status).toBe(200);
    expect(active.body.status).toBe('active');

    const loginRestored = await request(app)
      .post('/api/auth/login')
      .send({ email: target.email, password });
    expect(loginRestored.status).toBe(200);
  });

  it('lets only the full Administrator delete sub-admin and approval-only accounts directly', async () => {
    const target = await prisma.subAdministrator.create({
      data: {
        email: `delete-target-${suffix()}@test.local`,
        passwordHash: 'not-used',
        name: 'Delete Target',
        permissions: JSON.stringify(['APPROVALS']),
        createdById: adminId,
      },
    });
    const userManager = await prisma.subAdministrator.create({
      data: {
        email: `delete-user-manager-${suffix()}@test.local`,
        passwordHash: 'not-used',
        name: 'Delete User Manager',
        permissions: JSON.stringify(['USERS']),
        createdById: adminId,
      },
    });
    const userManagerToken = tokenFor({
      id: userManager.id,
      email: userManager.email,
      name: userManager.name,
      role: 'SUB_ADMINISTRATOR',
    });

    const denied = await request(app)
      .delete(`/api/rbac/sub-admins/${target.id}`)
      .set(auth(userManagerToken));
    expect(denied.status).toBe(403);
    expect(await prisma.subAdministrator.findUnique({ where: { id: target.id } })).not.toBeNull();

    const deleted = await request(app)
      .delete(`/api/rbac/sub-admins/${target.id}`)
      .set(auth(adminToken));
    expect(deleted.status).toBe(200);
    expect(deleted.body.deletedId).toBe(target.id);
    expect(await prisma.subAdministrator.findUnique({ where: { id: target.id } })).toBeNull();
  });
});

describe('Permissions are read from the database, not from the token', () => {
  // auth.ts looks the sub-admin up on every request specifically so that a
  // permission change applies immediately instead of waiting out their 7-day
  // JWT. Caching this into the token would be an easy "optimisation" to make
  // and would silently leave revoked admins with access for a week.
  it('revoking a permission takes effect on the very next request', async () => {
    const before = await request(app).get('/api/products/pending').set(auth(approverToken));
    expect(before.status).toBe(200);

    await prisma.subAdministrator.update({
      where: { id: approverId },
      data: { permissions: JSON.stringify([]) },
    });

    // Same token, no re-login.
    const after = await request(app).get('/api/products/pending').set(auth(approverToken));
    expect(after.status).toBe(403);

    await prisma.subAdministrator.update({
      where: { id: approverId },
      data: { permissions: JSON.stringify(['PRODUCT_APPROVAL']) },
    });

    const restored = await request(app).get('/api/products/pending').set(auth(approverToken));
    expect(restored.status).toBe(200);
  });

  it('denies a token whose sub-administrator no longer exists', async () => {
    const ghost = tokenFor({
      id: '00000000-0000-0000-0000-000000000000',
      email: 'deleted@test.local',
      name: 'Deleted Sub-Admin',
      role: 'SUB_ADMINISTRATOR',
    });

    const res = await request(app).get('/api/products/pending').set(auth(ghost));
    expect(res.status).toBe(403);
  });
});

describe('Token integrity', () => {
  it('rejects a token that was not signed with the server secret', async () => {
    // Header/payload lifted from a valid-looking token but signed with junk.
    const forged =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJpZCI6IjEiLCJyb2xlIjoiQURNSU5JU1RSQVRPUiJ9.' +
      'not-a-real-signature';

    const res = await request(app).get('/api/sellers').set(auth(forged));
    expect(res.status).toBe(401);
  });
});
