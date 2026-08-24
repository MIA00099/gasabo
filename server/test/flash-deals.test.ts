/**
 * Flash Deals - an admin puts a real product on the homepage countdown card
 * with a real deadline.
 *
 * The card used to show a fake clock that looped from 9999 forever and no
 * product at all. A deal is now a product with flashDealEndsAt in the future;
 * the endpoint filters by that deadline server-side, so an expired deal simply
 * stops being returned - the countdown cannot run backwards from zero.
 *
 * These guard: only admins (PRODUCTS permission) can set one; the end time
 * must be in the future; clearing works; and the public list shows only
 * active, ACTIVE-status deals, soonest first.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { signToken, type AuthUser } from '../src/middleware/auth.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const inHours = (h: number) => new Date(Date.now() + h * 3600 * 1000).toISOString();

let adminToken: string;
let sellerToken: string;
let categoryId: string;
let sellerId: string;

async function makeProduct(title: string, status = 'ACTIVE'): Promise<string> {
  const p = await prisma.product.create({
    data: {
      title, description: 'x', price: 1000, district: 'Gasabo',
      images: '[]', sellerId, categoryId, status,
    },
  });
  return p.id;
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash('pw', 10);
  const admin = await prisma.administrator.create({
    data: { email: `fd-admin-${Date.now()}@t.local`, passwordHash, name: 'FD Admin', role: 'ADMINISTRATOR' },
  });
  adminToken = signToken({ id: admin.id, email: admin.email, name: admin.name, role: 'ADMINISTRATOR' } as AuthUser);

  const seller = await prisma.seller.create({
    data: { email: `fd-seller-${Date.now()}@t.local`, passwordHash, businessName: 'FD Seller', contactPhone: '+250 700 000 000', district: 'Gasabo' },
  });
  sellerId = seller.id;
  sellerToken = signToken({ id: seller.id, email: seller.email, name: seller.businessName, role: 'SELLER' } as AuthUser);

  const cat = await prisma.category.create({ data: { name: `FD Cat ${Date.now()}`, slug: `fd-cat-${Date.now()}`, iconUrl: '📦' } });
  categoryId = cat.id;
});

describe('PATCH /api/products/:id/flash-deal', () => {
  it('lets an admin set a future end time', async () => {
    const id = await makeProduct('Deal A');
    const res = await request(app).patch(`/api/products/${id}/flash-deal`)
      .set(auth(adminToken)).send({ endsAt: inHours(3) });
    expect(res.status).toBe(200);
    expect(res.body.product.flashDealEndsAt).toBeTruthy();
  });

  it('rejects an end time in the past', async () => {
    const id = await makeProduct('Deal past');
    const res = await request(app).patch(`/api/products/${id}/flash-deal`)
      .set(auth(adminToken)).send({ endsAt: '2020-01-01T00:00:00.000Z' });
    expect(res.status).toBe(400);
  });

  it('rejects a non-date payload', async () => {
    const id = await makeProduct('Deal bad');
    const res = await request(app).patch(`/api/products/${id}/flash-deal`)
      .set(auth(adminToken)).send({ endsAt: 'soon' });
    expect(res.status).toBe(400);
  });

  it('clears the deal with null', async () => {
    const id = await makeProduct('Deal clear');
    await request(app).patch(`/api/products/${id}/flash-deal`).set(auth(adminToken)).send({ endsAt: inHours(2) });
    const res = await request(app).patch(`/api/products/${id}/flash-deal`).set(auth(adminToken)).send({ endsAt: null });
    expect(res.status).toBe(200);
    expect(res.body.product.flashDealEndsAt).toBeNull();
  });

  it('refuses a caller who is not an admin', async () => {
    const id = await makeProduct('Deal seller');
    // A seller has no PRODUCTS permission - requirePermission denies them.
    const res = await request(app).patch(`/api/products/${id}/flash-deal`)
      .set(auth(sellerToken)).send({ endsAt: inHours(2) });
    expect(res.status).toBe(403);
  });

  it('refuses an unauthenticated caller', async () => {
    const id = await makeProduct('Deal anon');
    const res = await request(app).patch(`/api/products/${id}/flash-deal`).send({ endsAt: inHours(2) });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/products/flash-deals', () => {
  it('returns active deals soonest-ending first', async () => {
    const soon = await makeProduct('Ends soon');
    const later = await makeProduct('Ends later');
    await request(app).patch(`/api/products/${later}/flash-deal`).set(auth(adminToken)).send({ endsAt: inHours(10) });
    await request(app).patch(`/api/products/${soon}/flash-deal`).set(auth(adminToken)).send({ endsAt: inHours(1) });

    const res = await request(app).get('/api/products/flash-deals');
    expect(res.status).toBe(200);
    const ids = res.body.products.map((p: any) => p.id);
    expect(ids).toContain(soon);
    expect(ids).toContain(later);
    // soonest first
    expect(ids.indexOf(soon)).toBeLessThan(ids.indexOf(later));
  });

  it('omits a deal whose time has passed', async () => {
    // Write a past deadline straight to the DB (the route rejects past times,
    // but a deal set earlier legitimately expires on its own).
    const id = await makeProduct('Already over');
    await prisma.product.update({ where: { id }, data: { flashDealEndsAt: new Date(Date.now() - 1000) } });

    const res = await request(app).get('/api/products/flash-deals');
    expect(res.body.products.map((p: any) => p.id)).not.toContain(id);
  });

  it('omits a deal on a non-ACTIVE product', async () => {
    // A pending listing is not public; it must not surface via the deals feed.
    const id = await makeProduct('Pending deal', 'PENDING');
    await prisma.product.update({ where: { id }, data: { flashDealEndsAt: new Date(Date.now() + 3600 * 1000) } });

    const res = await request(app).get('/api/products/flash-deals');
    expect(res.body.products.map((p: any) => p.id)).not.toContain(id);
  });

  it('serializes flashDealEndsAt on the products it returns', async () => {
    const id = await makeProduct('Serialized');
    await request(app).patch(`/api/products/${id}/flash-deal`).set(auth(adminToken)).send({ endsAt: inHours(4) });
    const res = await request(app).get('/api/products/flash-deals');
    const deal = res.body.products.find((p: any) => p.id === id);
    expect(deal.flashDealEndsAt).toBeTruthy();
  });
});
