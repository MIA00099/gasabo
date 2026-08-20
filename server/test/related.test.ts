/**
 * "More <category> Products" row regression suite.
 *
 * This row used to be built in the browser by filtering state.products, which
 * only ever holds whatever the last grid fetch returned. Opening a listing
 * from a shared link, a Google result or the sitemap fetches that one listing
 * and nothing else, so the filter found no siblings and the entire section
 * disappeared - precisely the entry points where a related row is worth
 * having. It is now served by GET /api/products/:id/related.
 *
 * The rules it has to hold: same category, never the listing itself, and
 * ACTIVE only - a pending or rejected listing must not become visible
 * sideways through a sibling's page when the grid hides it.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';

let electronicsId: string;
let subjectId: string;
let siblingIds: string[] = [];
let otherCategoryProductId: string;
let pendingSiblingId: string;

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

  const seller = await prisma.seller.create({
    data: {
      email: 'related-seller@test.local',
      passwordHash: 'not-used',
      businessName: 'Related Fixture Seller',
      contactPhone: '+250780000020',
    },
  });

  const electronics = await prisma.category.create({
    data: { name: 'Related Electronics', slug: 'related-electronics' },
  });
  electronicsId = electronics.id;

  const vehicles = await prisma.category.create({
    data: { name: 'Related Vehicles', slug: 'related-vehicles' },
  });

  const mk = (title: string, categoryId: string, status: 'ACTIVE' | 'PENDING') =>
    prisma.product.create({
      data: {
        title,
        description: `${title} fixture.`,
        price: 100000,
        district: 'Gasabo',
        condition: 'Brand New',
        images: JSON.stringify(['https://example.test/img.png']),
        categoryId,
        sellerId: seller.id,
        status,
      },
    });

  const subject = await mk('Subject Laptop', electronicsId, 'ACTIVE');
  subjectId = subject.id;

  for (const title of ['Sibling Phone', 'Sibling Headphones', 'Sibling Watch']) {
    const p = await mk(title, electronicsId, 'ACTIVE');
    siblingIds.push(p.id);
  }

  const pending = await mk('Unapproved Sibling', electronicsId, 'PENDING');
  pendingSiblingId = pending.id;

  const other = await mk('A Car In Another Category', vehicles.id, 'ACTIVE');
  otherCategoryProductId = other.id;
});

describe('GET /api/products/:id/related', () => {
  it('is reachable without authentication', async () => {
    const res = await request(app).get(`/api/products/${subjectId}/related`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  it('returns the other ACTIVE listings in the same category', async () => {
    const res = await request(app).get(`/api/products/${subjectId}/related`);
    const ids = res.body.products.map((p: any) => p.id);

    for (const id of siblingIds) expect(ids).toContain(id);
    expect(ids).toHaveLength(siblingIds.length);
  });

  it('never includes the listing being viewed', async () => {
    const res = await request(app).get(`/api/products/${subjectId}/related`);
    const ids = res.body.products.map((p: any) => p.id);
    expect(ids).not.toContain(subjectId);
  });

  it('excludes listings from other categories', async () => {
    const res = await request(app).get(`/api/products/${subjectId}/related`);
    const ids = res.body.products.map((p: any) => p.id);
    expect(ids).not.toContain(otherCategoryProductId);
  });

  it('does not leak an unapproved listing through a sibling page', async () => {
    // GET /api/products hides PENDING; this route must not be a way around it.
    const res = await request(app).get(`/api/products/${subjectId}/related`);
    const ids = res.body.products.map((p: any) => p.id);
    expect(ids).not.toContain(pendingSiblingId);
  });

  it('serves the fields the related card renders', async () => {
    const res = await request(app).get(`/api/products/${subjectId}/related`);
    const card = res.body.products[0];

    expect(card.title).toBeTruthy();
    expect(typeof card.price).toBe('number');
    expect(card.currency).toBeTruthy();
    expect(Array.isArray(card.images)).toBe(true);
    expect(card.district).toBeTruthy();
  });

  it('answers an unknown id with an empty list rather than a 404', async () => {
    // The detail page above this row already decides what a missing listing
    // means. This row must never be the thing that breaks the page.
    const res = await request(app).get(
      '/api/products/00000000-0000-0000-0000-000000000000/related',
    );
    expect(res.status).toBe(200);
    expect(res.body.products).toEqual([]);
  });

  it('answers for a PENDING listing with an empty list, not its siblings', async () => {
    const res = await request(app).get(`/api/products/${pendingSiblingId}/related`);
    expect(res.status).toBe(200);
    expect(res.body.products).toEqual([]);
  });

  it('returns an empty list for a category with only one listing', async () => {
    const res = await request(app).get(`/api/products/${otherCategoryProductId}/related`);
    expect(res.status).toBe(200);
    expect(res.body.products).toEqual([]);
  });
});

describe('Route ordering: /:id/related must not break the literal routes', () => {
  // Express matches in registration order. '/:id' cannot swallow '/:id/related'
  // (it matches one segment, not two), but the literal routes below it are
  // still worth pinning - 401 proves the request reached their auth guard
  // rather than being answered by a wildcard.
  it('leaves GET /api/products/mine reachable', async () => {
    const res = await request(app).get('/api/products/mine');
    expect(res.status).toBe(401);
  });

  it('leaves GET /api/products/pending reachable', async () => {
    const res = await request(app).get('/api/products/pending');
    expect(res.status).toBe(401);
  });

  it('still serves the single-listing route', async () => {
    const res = await request(app).get(`/api/products/${subjectId}`);
    expect(res.status).toBe(200);
    expect(res.body.product.id).toBe(subjectId);
  });
});
