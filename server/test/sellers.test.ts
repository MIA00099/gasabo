/**
 * Public seller directory (the Stores page) regression suite.
 *
 * GET /api/sellers/public is the only unauthenticated endpoint that returns
 * Seller rows, so it is the one place a column added to that model could
 * silently become public. The route selects fields explicitly and promises:
 *
 *   exposed   businessName, district, contactPhone, joined date, listings
 *   withheld  email, passwordHash, status, lastLoginAt
 *
 * These tests hold that promise. The leakage test asserts on the serialised
 * response rather than on named keys, so a future `include:` that pulls the
 * whole record back in fails here instead of shipping.
 *
 * The endpoint also has to stay declared above the '/:id' routes in
 * sellers.routes.ts - Express matches in registration order, and if one of
 * those were registered first, "public" would be read as a seller id and the
 * Stores page would 404 against a route that still looks present in the file.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';

let activeSellerId: string;
let suspendedSellerId: string;

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

  const category = await prisma.category.create({
    data: { name: 'Directory Fixtures', slug: 'directory-fixtures' },
  });

  const active = await prisma.seller.create({
    data: {
      email: 'directory-active@test.local',
      passwordHash: 'super-secret-hash-must-never-be-served',
      businessName: 'Visible Storefront',
      contactPhone: '+250780000010',
      district: 'Musanze',
      status: 'ACTIVE',
    },
  });
  activeSellerId = active.id;

  const suspended = await prisma.seller.create({
    data: {
      email: 'directory-suspended@test.local',
      passwordHash: 'not-used',
      businessName: 'Suspended Storefront',
      contactPhone: '+250780000011',
      district: 'Gasabo',
      status: 'SUSPENDED',
    },
  });
  suspendedSellerId = suspended.id;

  await prisma.product.create({
    data: {
      title: 'Live Listing',
      description: 'Approved and on sale.',
      price: 45000,
      sellerId: active.id,
      categoryId: category.id,
      district: 'Musanze',
      status: 'ACTIVE',
    },
  });

  await prisma.product.create({
    data: {
      title: 'Unmoderated Listing',
      description: 'Still awaiting review.',
      price: 999,
      sellerId: active.id,
      categoryId: category.id,
      status: 'PENDING',
    },
  });

  // A suspended seller's listing: reachable neither through the products
  // endpoint nor sideways through the seller directory.
  await prisma.product.create({
    data: {
      title: 'Listing Of A Suspended Seller',
      description: 'Should be unreachable.',
      price: 1000,
      sellerId: suspended.id,
      categoryId: category.id,
      status: 'ACTIVE',
    },
  });
});

describe('GET /api/sellers/public', () => {
  it('is reachable without authentication', async () => {
    const res = await request(app).get('/api/sellers/public');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sellers)).toBe(true);
  });

  it('is not swallowed by a /:id route', async () => {
    // If '/public' were matched as an id, the handler below would look it up
    // as a seller and this would not be a seller-shaped list.
    const res = await request(app).get('/api/sellers/public');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sellers');
  });

  it('leaves the admin seller list authenticated', async () => {
    const res = await request(app).get('/api/sellers');
    expect(res.status).toBe(401);
  });

  it('returns active sellers with the fields the store card renders', async () => {
    const res = await request(app).get('/api/sellers/public');
    const seller = res.body.sellers.find((s: any) => s.id === activeSellerId);

    expect(seller).toBeDefined();
    expect(seller.name).toBe('Visible Storefront');
    expect(seller.phone).toBe('+250780000010');
    expect(seller.district).toBe('Musanze');
    expect(seller.memberSince).toBeTruthy();
    expect(seller.categories).toEqual(['Directory Fixtures']);
  });

  it('omits suspended sellers entirely', async () => {
    const res = await request(app).get('/api/sellers/public');
    const ids = res.body.sellers.map((s: any) => s.id);
    expect(ids).not.toContain(suspendedSellerId);
  });

  it('does not surface a suspended seller listing through the directory', async () => {
    const res = await request(app).get('/api/sellers/public');
    const titles = res.body.sellers.flatMap((s: any) => s.products.map((p: any) => p.title));
    expect(titles).not.toContain('Listing Of A Suspended Seller');
  });

  it('shows only ACTIVE listings, and counts only those', async () => {
    const res = await request(app).get('/api/sellers/public');
    const seller = res.body.sellers.find((s: any) => s.id === activeSellerId);

    const titles = seller.products.map((p: any) => p.title);
    expect(titles).toContain('Live Listing');
    expect(titles).not.toContain('Unmoderated Listing');

    // productCount drives "N Products Listed" on the card - it must agree
    // with what is actually rendered rather than counting every row.
    expect(seller.productCount).toBe(1);
    expect(seller.productCount).toBe(seller.products.length);
  });

  it('never serves credentials or account state', async () => {
    const res = await request(app).get('/api/sellers/public');
    const body = JSON.stringify(res.body);

    for (const secret of [
      'passwordHash',
      'super-secret-hash-must-never-be-served',
      'directory-active@test.local',
      'lastLoginAt',
    ]) {
      expect(body).not.toContain(secret);
    }
  });
});
