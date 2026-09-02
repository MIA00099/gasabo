/**
 * Contact form pipeline: POST /api/contact (public) stores a ContactMessage,
 * notifies REPORTS-scoped admins and best-effort emails the contact address;
 * the GET/PATCH/DELETE side is the admin Contact Messages panel, gated on the
 * REPORTS permission (a full Administrator always passes).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { signToken, type AuthUser } from '../src/middleware/auth.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

let adminToken: string;
let sellerToken: string;
let reportsSubAdminToken: string;
let plainSubAdminToken: string;

beforeAll(async () => {
  const passwordHash = await bcrypt.hash('pw', 10);

  const admin = await prisma.administrator.create({
    data: { email: `ct-admin-${Date.now()}@t.local`, passwordHash, name: 'CT Admin', role: 'ADMINISTRATOR' },
  });
  adminToken = signToken({ id: admin.id, email: admin.email, name: admin.name, role: 'ADMINISTRATOR' } as AuthUser);

  const seller = await prisma.seller.create({
    data: { email: `ct-seller-${Date.now()}@t.local`, passwordHash, businessName: 'CT Seller', contactPhone: '+250 700 000 000', district: 'Gasabo' },
  });
  sellerToken = signToken({ id: seller.id, email: seller.email, name: seller.businessName, role: 'SELLER' } as AuthUser);

  const reportsSub = await prisma.subAdministrator.create({
    data: {
      email: `ct-sub-reports-${Date.now()}@t.local`, passwordHash, name: 'Reports Sub',
      permissions: JSON.stringify(['REPORTS']), createdById: admin.id,
    },
  });
  reportsSubAdminToken = signToken({ id: reportsSub.id, email: reportsSub.email, name: reportsSub.name, role: 'SUB_ADMINISTRATOR' } as AuthUser);

  const plainSub = await prisma.subAdministrator.create({
    data: {
      email: `ct-sub-plain-${Date.now()}@t.local`, passwordHash, name: 'Plain Sub',
      permissions: JSON.stringify(['PRODUCTS']), createdById: admin.id,
    },
  });
  plainSubAdminToken = signToken({ id: plainSub.id, email: plainSub.email, name: plainSub.name, role: 'SUB_ADMINISTRATOR' } as AuthUser);
});

describe('POST /api/contact', () => {
  it('stores a submission and notifies REPORTS-scoped admins', async () => {
    const res = await request(app).post('/api/contact').send({
      name: 'Aline U.', email: 'aline@example.rw', phone: '+250 788 111 222',
      subject: 'Listing question', message: 'Is the Toyota still available?',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const saved = await prisma.contactMessage.findFirst({ where: { email: 'aline@example.rw' } });
    expect(saved).toBeTruthy();
    expect(saved!.status).toBe('NEW');
    expect(saved!.subject).toBe('Listing question');

    const note = await prisma.notification.findFirst({
      where: { type: 'CONTACT_MESSAGE', message: { contains: 'Aline U.' } },
    });
    expect(note, 'an admin notification should be created').toBeTruthy();
  });

  it('accepts a minimal submission (no phone, no subject)', async () => {
    const res = await request(app).post('/api/contact').send({
      name: 'Bob', email: 'bob@example.com', message: 'Hello there team.',
    });
    expect(res.status).toBe(201);
    const saved = await prisma.contactMessage.findFirst({ where: { email: 'bob@example.com' } });
    expect(saved!.phone).toBeNull();
    expect(saved!.subject).toBeNull();
  });

  it('rejects a missing message or a bad email', async () => {
    const noMessage = await request(app).post('/api/contact').send({ name: 'No Msg', email: 'x@y.com' });
    expect(noMessage.status).toBe(400);

    const badEmail = await request(app).post('/api/contact').send({ name: 'Bad Email', email: 'not-an-email', message: 'hi there' });
    expect(badEmail.status).toBe(400);
  });
});

describe('GET /api/contact', () => {
  it('is admin-only and returns messages newest first', async () => {
    const res = await request(app).get('/api/contact').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
    const times = res.body.messages.map((m: any) => new Date(m.createdAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('allows a Sub-Administrator holding REPORTS', async () => {
    const res = await request(app).get('/api/contact').set(auth(reportsSubAdminToken));
    expect(res.status).toBe(200);
  });

  it('refuses a Sub-Administrator without REPORTS, a seller, and an anonymous caller', async () => {
    expect((await request(app).get('/api/contact').set(auth(plainSubAdminToken))).status).toBe(403);
    expect((await request(app).get('/api/contact').set(auth(sellerToken))).status).toBe(403);
    expect((await request(app).get('/api/contact')).status).toBe(401);
  });
});

describe('PATCH / DELETE /api/contact/:id', () => {
  it('updates status through the allowed values and rejects a bad one', async () => {
    await request(app).post('/api/contact').send({ name: 'Cara', email: 'cara@example.com', message: 'A question about stores.' });
    const msg = await prisma.contactMessage.findFirst({ where: { email: 'cara@example.com' } });

    const read = await request(app).patch(`/api/contact/${msg!.id}`).set(auth(adminToken)).send({ status: 'READ' });
    expect(read.status).toBe(200);
    expect(read.body.message.status).toBe('READ');

    const bad = await request(app).patch(`/api/contact/${msg!.id}`).set(auth(adminToken)).send({ status: 'SPAM' });
    expect(bad.status).toBe(400);
  });

  it('deletes a message', async () => {
    await request(app).post('/api/contact').send({ name: 'Dee', email: 'dee@example.com', message: 'Please delete me later.' });
    const msg = await prisma.contactMessage.findFirst({ where: { email: 'dee@example.com' } });

    const res = await request(app).delete(`/api/contact/${msg!.id}`).set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(await prisma.contactMessage.findUnique({ where: { id: msg!.id } })).toBeNull();
  });

  it('refuses PATCH/DELETE without the REPORTS permission', async () => {
    const anyMsg = await prisma.contactMessage.findFirst();
    expect((await request(app).patch(`/api/contact/${anyMsg!.id}`).set(auth(sellerToken)).send({ status: 'READ' })).status).toBe(403);
    expect((await request(app).delete(`/api/contact/${anyMsg!.id}`).set(auth(plainSubAdminToken))).status).toBe(403);
  });
});
