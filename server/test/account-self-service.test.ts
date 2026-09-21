/**
 * Self-service account edits and category rename (Task 2).
 *
 *  - Admin renames a category (name + slug), with the same duplicate guard as
 *    creation, but allowed to fix only the capitalisation of its own name.
 *  - Any signed-in account changes its own password (prove the old one first).
 *  - A seller edits their own business name and phone.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { signToken, type AuthUser } from '../src/middleware/auth.js';

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

let adminToken: string;
let adminId: string;
let subAdminToken: string;
let subAdminId: string;
let sellerToken: string;
let sellerId: string;
let catId: string;

beforeAll(async () => {
  const passwordHash = await bcrypt.hash('OldPass1', 10);
  const admin = await prisma.administrator.create({
    data: { email: `acc-admin-${Date.now()}@t.local`, passwordHash, name: 'Acc Admin', role: 'ADMINISTRATOR' },
  });
  adminId = admin.id;
  adminToken = signToken({ id: admin.id, email: admin.email, name: admin.name, role: 'ADMINISTRATOR' } as AuthUser);

  const subAdmin = await prisma.subAdministrator.create({
    data: {
      email: `acc-sub-${Date.now()}@t.local`,
      passwordHash,
      name: 'Approval Account',
      permissions: JSON.stringify(['APPROVALS']),
      mustChangePassword: true,
      createdById: admin.id,
    },
  });
  subAdminId = subAdmin.id;
  subAdminToken = signToken({ id: subAdmin.id, email: subAdmin.email, name: subAdmin.name, role: 'SUB_ADMINISTRATOR' } as AuthUser);

  const seller = await prisma.seller.create({
    data: { email: `acc-seller-${Date.now()}@t.local`, passwordHash, businessName: 'Old Shop', contactPhone: '+250700000001', district: 'Gasabo' },
  });
  sellerId = seller.id;
  sellerToken = signToken({ id: seller.id, email: seller.email, name: seller.businessName, role: 'SELLER' } as AuthUser);

  const cat = await prisma.category.create({ data: { name: `Cat ${Date.now()}`, slug: `cat-${Date.now()}`, iconUrl: '📦' } });
  catId = cat.id;
});

describe('PATCH /api/categories/:id (rename)', () => {
  it('renames a category and regenerates its slug', async () => {
    const res = await request(app).patch(`/api/categories/${catId}`).set(auth(adminToken)).send({ name: 'Renamed Electronics' });
    expect(res.status).toBe(200);
    expect(res.body.category.name).toBe('Renamed Electronics');
    const stored = await prisma.category.findUnique({ where: { id: catId } });
    expect(stored?.slug).toBe('renamed-electronics');
  });

  it('rejects a name that clashes with another category', async () => {
    const other = await prisma.category.create({ data: { name: 'Taken Name', slug: 'taken-name', iconUrl: '📦' } });
    const res = await request(app).patch(`/api/categories/${catId}`).set(auth(adminToken)).send({ name: 'taken name' });
    expect(res.status).toBe(409);
    await prisma.category.delete({ where: { id: other.id } });
  });

  it('allows fixing only the capitalisation of its own name', async () => {
    const uniqueName = `case-only-${Date.now()}`;
    await request(app).patch(`/api/categories/${catId}`).set(auth(adminToken)).send({ name: uniqueName });
    const res = await request(app).patch(`/api/categories/${catId}`).set(auth(adminToken)).send({ name: uniqueName.toUpperCase() });
    expect(res.status).toBe(200);
    expect(res.body.category.name).toBe(uniqueName.toUpperCase());
  });

  it('requires authentication', async () => {
    const res = await request(app).patch(`/api/categories/${catId}`).send({ name: 'Nope' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/change-password', () => {
  it('rejects a wrong current password', async () => {
    const res = await request(app).post('/api/auth/change-password').set(auth(sellerToken)).send({ currentPassword: 'WrongPass', newPassword: 'BrandNew1' });
    expect(res.status).toBe(400);
  });

  it('changes the password when the current one is correct', async () => {
    const res = await request(app).post('/api/auth/change-password').set(auth(sellerToken)).send({ currentPassword: 'OldPass1', newPassword: 'BrandNew1' });
    expect(res.status).toBe(200);
    // The new password now works, the old one does not.
    const stored = await prisma.seller.findUnique({ where: { id: sellerId } });
    expect(await bcrypt.compare('BrandNew1', stored!.passwordHash)).toBe(true);
    expect(await bcrypt.compare('OldPass1', stored!.passwordHash)).toBe(false);
  });

  it('rejects a new password identical to the current one', async () => {
    const res = await request(app).post('/api/auth/change-password').set(auth(sellerToken)).send({ currentPassword: 'BrandNew1', newPassword: 'BrandNew1' });
    expect(res.status).toBe(400);
  });

  it('lets the main administrator change their own password', async () => {
    const res = await request(app).post('/api/auth/change-password').set(auth(adminToken)).send({ currentPassword: 'OldPass1', newPassword: 'AdminNew1' });
    expect(res.status).toBe(200);

    const stored = await prisma.administrator.findUnique({ where: { id: adminId } });
    expect(await bcrypt.compare('AdminNew1', stored!.passwordHash)).toBe(true);
    expect(await bcrypt.compare('OldPass1', stored!.passwordHash)).toBe(false);
  });

  it('lets the approval sub-admin change their own password and clears the temporary-password gate', async () => {
    const res = await request(app).post('/api/auth/change-password').set(auth(subAdminToken)).send({ currentPassword: 'OldPass1', newPassword: 'ApprovalNew1' });
    expect(res.status).toBe(200);

    const stored = await prisma.subAdministrator.findUnique({ where: { id: subAdminId } });
    expect(await bcrypt.compare('ApprovalNew1', stored!.passwordHash)).toBe(true);
    expect(await bcrypt.compare('OldPass1', stored!.passwordHash)).toBe(false);
    expect(stored?.mustChangePassword).toBe(false);
  });
});

describe('PATCH /api/auth/profile (seller self-edit)', () => {
  it('updates the seller name and phone', async () => {
    const res = await request(app).patch('/api/auth/profile').set(auth(sellerToken)).send({ name: 'New Shop Name', phone: '+250788123456' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('New Shop Name');
    expect(res.body.user.phone).toBe('+250788123456');
    const stored = await prisma.seller.findUnique({ where: { id: sellerId } });
    expect(stored?.businessName).toBe('New Shop Name');
    expect(stored?.contactPhone).toBe('+250788123456');
  });

  it('does not let an administrator use the seller profile edit', async () => {
    const res = await request(app).patch('/api/auth/profile').set(auth(adminToken)).send({ name: 'Hax' });
    expect(res.status).toBe(403);
  });
});
