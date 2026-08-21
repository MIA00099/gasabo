/**
 * GET /auth/me - who the caller is right now.
 *
 * This endpoint used to answer `req.user`, the decoded JWT. That is only a
 * record of who somebody was when they signed in, and tokens here last seven
 * days. So it kept saying "Administrator, all permissions" for a week after
 * the account was deleted, demoted or suspended, and it kept reporting a
 * Sub-Administrator's old permission set after an Administrator changed it
 * that morning.
 *
 * Nothing was reading it, which is why the staleness never showed. Now the
 * client checks it on every cold load and adopts the answer - so if it starts
 * echoing the token again, the whole point of the check is lost silently: the
 * app would go on trusting a snapshot and simply never notice a change. These
 * tests are what stop that.
 *
 * The route guards themselves are covered in rbac.test.ts; this is only about
 * the identity the client is handed.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { signToken, type AuthUser } from '../src/middleware/auth.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

let adminId: string;
let adminToken: string;
let subAdminId: string;
let subAdminToken: string;
let sellerId: string;
let sellerToken: string;

beforeAll(async () => {
  const passwordHash = await bcrypt.hash('test-password', 10);

  const admin = await prisma.administrator.create({
    data: { email: `me-admin-${Date.now()}@test.local`, passwordHash, name: 'Me Admin', role: 'ADMINISTRATOR' },
  });
  adminId = admin.id;
  adminToken = signToken({ id: admin.id, email: admin.email, name: admin.name, role: 'ADMINISTRATOR' } as AuthUser);

  const subAdmin = await prisma.subAdministrator.create({
    data: {
      email: `me-sub-${Date.now()}@test.local`,
      passwordHash,
      name: 'Me Sub',
      permissions: JSON.stringify(['PRODUCTS', 'SELLERS']),
      createdById: admin.id,
    },
  });
  subAdminId = subAdmin.id;
  subAdminToken = signToken({ id: subAdmin.id, email: subAdmin.email, name: subAdmin.name, role: 'SUB_ADMINISTRATOR' } as AuthUser);

  const seller = await prisma.seller.create({
    data: {
      email: `me-seller-${Date.now()}@test.local`,
      passwordHash,
      businessName: 'Me Seller',
      contactPhone: '+250 700 000 000',
      district: 'Gasabo',
    },
  });
  sellerId = seller.id;
  sellerToken = signToken({ id: seller.id, email: seller.email, name: seller.businessName, role: 'SELLER' } as AuthUser);
});

describe('GET /auth/me', () => {
  it('refuses a caller with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('refuses a tampered token', async () => {
    const res = await request(app).get('/api/auth/me').set(auth(adminToken.slice(0, -6) + 'BADSIG'));
    expect(res.status).toBe(401);
  });

  it('answers from the database, not from the token', async () => {
    // The giveaway that the old version was echoing the JWT: iat/exp came
    // back as part of the "user", and permissions never did.
    const res = await request(app).get('/api/auth/me').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.user).not.toHaveProperty('iat');
    expect(res.body.user).not.toHaveProperty('exp');
    expect(res.body.user.id).toBe(adminId);
    expect(res.body.user.role).toBe('ADMINISTRATOR');
    expect(res.body.user.permissions, 'an administrator holds every module').toBeTruthy();
    expect(Object.values(res.body.user.permissions).every(Boolean)).toBe(true);
  });

  it('reports a name change made after the token was issued', async () => {
    await prisma.administrator.update({ where: { id: adminId }, data: { name: 'Renamed Admin' } });
    const res = await request(app).get('/api/auth/me').set(auth(adminToken));
    expect(res.body.user.name).toBe('Renamed Admin');
  });

  it('reports a permission change made after the token was issued', async () => {
    // This is the case that matters: an Administrator revokes a module and
    // the Sub-Administrator's own client should stop offering it, without
    // waiting out their seven-day token.
    const before = await request(app).get('/api/auth/me').set(auth(subAdminToken));
    expect(before.body.user.permissions.seller_mgmt).toBe(true);
    expect(before.body.user.permissions.product_mgmt).toBe(true);

    await prisma.subAdministrator.update({
      where: { id: subAdminId },
      data: { permissions: JSON.stringify(['PRODUCTS']) },
    });

    const after = await request(app).get('/api/auth/me').set(auth(subAdminToken));
    expect(after.body.user.permissions.seller_mgmt, 'revoked module still reported as held').toBe(false);
    expect(after.body.user.permissions.product_mgmt, 'kept module should still be held').toBe(true);
  });

  it('rejects a token whose account has been deleted', async () => {
    const passwordHash = await bcrypt.hash('test-password', 10);
    const doomed = await prisma.subAdministrator.create({
      data: {
        email: `me-doomed-${Date.now()}@test.local`,
        passwordHash,
        name: 'Doomed',
        permissions: JSON.stringify([]),
        createdById: adminId,
      },
    });
    const token = signToken({ id: doomed.id, email: doomed.email, name: doomed.name, role: 'SUB_ADMINISTRATOR' } as AuthUser);

    expect((await request(app).get('/api/auth/me').set(auth(token))).status).toBe(200);

    await prisma.subAdministrator.delete({ where: { id: doomed.id } });

    // The token is still cryptographically valid - it just belongs to nobody.
    const after = await request(app).get('/api/auth/me').set(auth(token));
    expect(after.status).toBe(401);
  });

  it('rejects a seller who has since been suspended', async () => {
    expect((await request(app).get('/api/auth/me').set(auth(sellerToken))).status).toBe(200);

    await prisma.seller.update({ where: { id: sellerId }, data: { status: 'SUSPENDED' } });

    const after = await request(app).get('/api/auth/me').set(auth(sellerToken));
    expect(after.status, 'a suspended seller kept a working session').toBe(401);

    await prisma.seller.update({ where: { id: sellerId }, data: { status: 'ACTIVE' } });
  });

  it('does not hand a seller an admin permission map', async () => {
    const res = await request(app).get('/api/auth/me').set(auth(sellerToken));
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('SELLER');
    expect(res.body.user.permissions).toBeUndefined();
  });
});
