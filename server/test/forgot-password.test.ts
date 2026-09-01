/**
 * POST /auth/forgot-password - the sign-in screen's "Forgot password?".
 *
 * That link was an <a href="#"> with no handler bound to it: it pushed a bare
 * hash and did nothing, so a seller locked out of their account had no way
 * back in. There is no mail provider in this app, so the endpoint cannot send
 * a reset link; what it does is raise the request with the administrators who
 * hold the SELLERS module, who reset the password from Seller Management and
 * pass the temporary one on.
 *
 * Two things worth guarding, because both fail silently:
 *
 *  1. The reply must not differ between a known and an unknown address. The
 *     endpoint is public and unauthenticated, so any difference - status,
 *     body, even wording - turns it into a way to enumerate who has an
 *     account here.
 *  2. It must actually reach an administrator who can act. A 200 with no
 *     notification behind it looks identical to the seller and leaves them
 *     waiting for a reset nobody was told to do.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';

let sellerEmail: string;
let sellerId: string;
let adminId: string;
let scopedSubAdminId: string;
let unscopedSubAdminId: string;

beforeAll(async () => {
  const passwordHash = await bcrypt.hash('test-password', 10);
  const stamp = Date.now();

  sellerEmail = `forgot-seller-${stamp}@test.local`;
  const seller = await prisma.seller.create({
    data: {
      email: sellerEmail,
      passwordHash,
      businessName: 'Forgot Seller',
      contactPhone: '+250 700 000 000',
      district: 'Gasabo',
    },
  });
  sellerId = seller.id;

  const admin = await prisma.administrator.create({
    data: { email: `forgot-admin-${stamp}@test.local`, passwordHash, name: 'Forgot Admin', role: 'ADMINISTRATOR' },
  });
  adminId = admin.id;

  const scoped = await prisma.subAdministrator.create({
    data: {
      email: `forgot-sub-yes-${stamp}@test.local`,
      passwordHash,
      name: 'Seller Manager',
      permissions: JSON.stringify(['SELLERS']),
      createdById: admin.id,
    },
  });
  scopedSubAdminId = scoped.id;

  const unscoped = await prisma.subAdministrator.create({
    data: {
      email: `forgot-sub-no-${stamp}@test.local`,
      passwordHash,
      name: 'Audit Only',
      permissions: JSON.stringify(['AUDIT']),
      createdById: admin.id,
    },
  });
  unscopedSubAdminId = unscoped.id;
});

const post = (body: string | object | undefined) => request(app).post('/api/auth/forgot-password').send(body);

describe('POST /api/auth/forgot-password', () => {
  it('needs no authentication - the caller is locked out', async () => {
    const res = await post({ email: `nobody-${Date.now()}@test.local` });
    expect(res.status).toBe(200);
  });

  it('rejects something that is not an email address', async () => {
    const res = await post({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('answers an unknown address exactly as it answers a real one', async () => {
    // Any difference here is an account-enumeration oracle.
    const known = await post({ email: sellerEmail });
    const unknown = await post({ email: `ghost-${Date.now()}@test.local` });

    expect(known.status).toBe(unknown.status);
    expect(known.body).toEqual(unknown.body);
  });

  it('notifies the administrators who can actually run the reset', async () => {
    const email = `forgot-notify-${Date.now()}@test.local`;
    const seller = await prisma.seller.create({
      data: { email, passwordHash: 'x', businessName: 'Notify Me', contactPhone: '+250 700 000 001', district: 'Gasabo' },
    });

    const res = await post({ email });
    expect(res.status).toBe(200);

    const notifications = await prisma.notification.findMany({
      where: { type: 'PASSWORD_RESET_REQUEST', message: { contains: email } },
    });

    const recipients = notifications.map((n) => n.recipientId);
    expect(recipients, 'the full administrator was not told').toContain(adminId);
    expect(recipients, 'the sub-admin holding SELLERS was not told').toContain(scopedSubAdminId);
    // A sub-admin without the SELLERS module cannot open Seller Management,
    // so pinging them is a false alarm, not a notification.
    expect(recipients, 'a sub-admin with no SELLERS permission was told').not.toContain(unscopedSubAdminId);

    for (const n of notifications) {
      expect(n.message, 'the message must name the account to reset').toContain(seller.businessName);
      expect(n.message, 'the message must tell admins what action to take').toContain('click Reset Pass');
      expect(n.message, 'the message must make clear the request itself does not reset the password').toContain(
        'does not change the password',
      );
    }
  });

  it('clearly tells the seller what happens next without promising an instant reset', async () => {
    const res = await post({ email: sellerEmail });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Password reset request sent.');
    expect(res.body.message).toContain('Seller Support has been notified.');
    expect(res.body.message).toContain('temporary password');
  });

  it('does not stack up a fresh notification on every attempt', async () => {
    // The endpoint is public, so without this anyone could fill the admin
    // notification list by submitting the same address in a loop.
    const email = `forgot-repeat-${Date.now()}@test.local`;
    await prisma.seller.create({
      data: { email, passwordHash: 'x', businessName: 'Repeat Me', contactPhone: '+250 700 000 002', district: 'Gasabo' },
    });

    await post({ email });
    const afterFirst = await prisma.notification.count({
      where: { type: 'PASSWORD_RESET_REQUEST', message: { contains: email } },
    });

    await post({ email });
    await post({ email });
    const afterThree = await prisma.notification.count({
      where: { type: 'PASSWORD_RESET_REQUEST', message: { contains: email } },
    });

    expect(afterFirst).toBeGreaterThan(0);
    expect(afterThree, 'repeat requests created more notifications').toBe(afterFirst);
  });

  it('leaves the password alone - this only asks for a reset', async () => {
    const before = await prisma.seller.findUniqueOrThrow({ where: { id: sellerId } });
    await post({ email: sellerEmail });
    const after = await prisma.seller.findUniqueOrThrow({ where: { id: sellerId } });
    expect(after.passwordHash).toBe(before.passwordHash);
  });

  it('records the request in the audit log', async () => {
    const email = `forgot-audit-${Date.now()}@test.local`;
    const seller = await prisma.seller.create({
      data: { email, passwordHash: 'x', businessName: 'Audit Me', contactPhone: '+250 700 000 003', district: 'Gasabo' },
    });

    await post({ email });

    const entry = await prisma.auditLog.findFirst({
      where: { action: 'PASSWORD_RESET_REQUESTED', targetId: seller.id },
    });
    expect(entry, 'no audit entry for the reset request').toBeTruthy();
    expect(entry!.actorType).toBe('SELLER');
  });

  it('ignores a suspended account', async () => {
    // A suspended seller cannot sign in even with a fresh password, so there
    // is nothing for an administrator to do about the request.
    const email = `forgot-suspended-${Date.now()}@test.local`;
    await prisma.seller.create({
      data: {
        email,
        passwordHash: 'x',
        businessName: 'Suspended Seller',
        contactPhone: '+250 700 000 004',
        district: 'Gasabo',
        status: 'SUSPENDED',
      },
    });

    const res = await post({ email });
    expect(res.status, 'a suspended account must not be distinguishable').toBe(200);

    const count = await prisma.notification.count({
      where: { type: 'PASSWORD_RESET_REQUEST', message: { contains: email } },
    });
    expect(count).toBe(0);
  });
});
