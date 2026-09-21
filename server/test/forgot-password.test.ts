/**
 * Seller password recovery now follows the Supabase reset-email flow:
 *
 *   Forgot Password -> Supabase sends reset email -> /reset-password opens
 *   -> seller enters a new password -> Supabase and the local Seller password
 *   hash are updated.
 *
 * The local hash matters because Kigali Market's normal login endpoint still
 * authenticates against the Seller table. Supabase owns the recovery link and
 * verifies the reset session; this app syncs the accepted password back into
 * its own login store.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';

const mocks = vi.hoisted(() => ({
  sendSellerPasswordResetLink: vi.fn(),
  getSupabaseUserForRecoveryToken: vi.fn(),
  updateSupabaseUserPassword: vi.fn(),
  signInWithSupabasePassword: vi.fn(),
}));

vi.mock('../src/utils/supabaseAuth.js', () => ({
  sendSellerPasswordResetLink: (...args: any[]) => mocks.sendSellerPasswordResetLink(...args),
  getSupabaseUserForRecoveryToken: (...args: any[]) => mocks.getSupabaseUserForRecoveryToken(...args),
  updateSupabaseUserPassword: (...args: any[]) => mocks.updateSupabaseUserPassword(...args),
  signInWithSupabasePassword: (...args: any[]) => mocks.signInWithSupabasePassword(...args),
}));

let sellerEmail: string;
let sellerId: string;
let oldPasswordHash: string;

beforeAll(async () => {
  oldPasswordHash = await bcrypt.hash('old-password', 10);
  const stamp = Date.now();

  sellerEmail = `forgot-seller-${stamp}@test.local`;
  const seller = await prisma.seller.create({
    data: {
      email: sellerEmail,
      passwordHash: oldPasswordHash,
      businessName: 'Forgot Seller',
      contactPhone: '+250 700 000 000',
      district: 'Gasabo',
    },
  });
  sellerId = seller.id;
});

beforeEach(() => {
  mocks.sendSellerPasswordResetLink.mockReset().mockResolvedValue(undefined);
  mocks.getSupabaseUserForRecoveryToken.mockReset().mockResolvedValue({ id: 'supabase-user-1', email: sellerEmail });
  mocks.updateSupabaseUserPassword.mockReset().mockResolvedValue(undefined);
  mocks.signInWithSupabasePassword.mockReset().mockResolvedValue(false);
});

const postForgot = (body: string | object | undefined) => request(app).post('/api/auth/forgot-password').send(body);

describe('POST /api/auth/forgot-password', () => {
  it('needs no authentication - the caller is locked out', async () => {
    const res = await postForgot({ email: `nobody-${Date.now()}@test.local` });
    expect(res.status).toBe(200);
  });

  it('rejects something that is not an email address', async () => {
    const res = await postForgot({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('answers an unknown address exactly as it answers a real one', async () => {
    const known = await postForgot({ email: sellerEmail });
    const unknown = await postForgot({ email: `ghost-${Date.now()}@test.local` });

    expect(known.status).toBe(unknown.status);
    expect(known.body).toEqual(unknown.body);
  });

  it('sends a Supabase recovery email for an active seller account', async () => {
    const res = await postForgot({ email: sellerEmail });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('password reset email has been sent');
    expect(res.body.message).toContain('choose a new password');
    expect(mocks.sendSellerPasswordResetLink).toHaveBeenCalledWith({
      email: sellerEmail,
      name: 'Forgot Seller',
    });
  });

  it('does not call Supabase for unknown or suspended accounts', async () => {
    await postForgot({ email: `ghost-${Date.now()}@test.local` });

    const suspendedEmail = `forgot-suspended-${Date.now()}@test.local`;
    await prisma.seller.create({
      data: {
        email: suspendedEmail,
        passwordHash: oldPasswordHash,
        businessName: 'Suspended Seller',
        contactPhone: '+250 700 000 004',
        district: 'Gasabo',
        status: 'SUSPENDED',
      },
    });
    await postForgot({ email: suspendedEmail });

    expect(mocks.sendSellerPasswordResetLink).not.toHaveBeenCalled();
  });

  it('records the reset email request in the audit log', async () => {
    await postForgot({ email: sellerEmail });

    const entry = await prisma.auditLog.findFirst({
      where: { action: 'PASSWORD_RESET_REQUESTED', targetId: sellerId },
      orderBy: { createdAt: 'desc' },
    });
    expect(entry, 'no audit entry for the reset email request').toBeTruthy();
    expect(entry!.actorType).toBe('SELLER');
    expect(entry!.details).toContain('Supabase password reset email');
  });
});

describe('POST /api/auth/reset-password/complete', () => {
  it('verifies the Supabase recovery token and updates both Supabase and the local seller hash', async () => {
    const res = await request(app).post('/api/auth/reset-password/complete').send({
      accessToken: 'access-token-from-email-link-12345',
      newPassword: 'NewSellerPass1',
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Password updated');
    expect(mocks.getSupabaseUserForRecoveryToken).toHaveBeenCalledWith('access-token-from-email-link-12345');
    expect(mocks.updateSupabaseUserPassword).toHaveBeenCalledWith('supabase-user-1', 'NewSellerPass1');

    const seller = await prisma.seller.findUniqueOrThrow({ where: { id: sellerId } });
    expect(await bcrypt.compare('NewSellerPass1', seller.passwordHash)).toBe(true);
    expect(await bcrypt.compare('old-password', seller.passwordHash)).toBe(false);
  });

  it('rejects an invalid or expired Supabase recovery token', async () => {
    mocks.getSupabaseUserForRecoveryToken.mockRejectedValueOnce(new Error('This reset link is invalid or expired.'));

    const res = await request(app).post('/api/auth/reset-password/complete').send({
      accessToken: 'expired-access-token-from-email-link',
      newPassword: 'NewSellerPass1',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('invalid or expired');
    expect(mocks.updateSupabaseUserPassword).not.toHaveBeenCalled();
  });

  it('lets login recover if Supabase accepted the new password before the local hash synced', async () => {
    const email = `supabase-login-${Date.now()}@test.local`;
    const seller = await prisma.seller.create({
      data: {
        email,
        passwordHash: oldPasswordHash,
        businessName: 'Supabase Login Seller',
        contactPhone: '+250 700 000 010',
        district: 'Gasabo',
      },
    });
    mocks.signInWithSupabasePassword.mockResolvedValueOnce(true);

    const res = await request(app).post('/api/auth/login').send({ email, password: 'SyncedFromSupabase1' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    const updated = await prisma.seller.findUniqueOrThrow({ where: { id: seller.id } });
    expect(await bcrypt.compare('SyncedFromSupabase1', updated.passwordHash)).toBe(true);
  });
});
