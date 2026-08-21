/**
 * Admin ratings and buyer likes.
 *
 * Two separate things that arrived together:
 *
 *  - rating is a single number an administrator assigns. There is no review
 *    model behind it, and the storefront was printing a hard-coded 4.8 with
 *    "(128)" on every card, so an unrated listing must come back as null and
 *    show no stars rather than a made-up score.
 *
 *  - likes are left by buyers, who are usually signed out on a classifieds
 *    site. Each like is a row keyed by visitor, so the same person cannot run
 *    the number up by refreshing and can take a like back. That is deliberately
 *    not proof against someone scripting the endpoint - it stops accident and
 *    idle spam, not determined abuse.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { signToken } from '../src/middleware/auth.js';

let adminToken: string;
let sellerToken: string;
let productId: string;
let pendingId: string;

const V1 = 'visitor-key-one-aaaa';
const V2 = 'visitor-key-two-bbbb';
const like = (id: string, key?: string) => {
  const r = request(app).post(`/api/products/${id}/like`);
  return key ? r.set('x-visitor-key', key) : r;
};
const unlike = (id: string, key: string) =>
  request(app).delete(`/api/products/${id}/like`).set('x-visitor-key', key);

beforeAll(async () => {
  if (process.env.ALLOW_DESTRUCTIVE_DB_TESTS !== 'yes') {
    throw new Error(
      'Refusing to wipe the database: safety guard did not run. ' +
        'Expected server/test/setup.ts to have validated an isolated test DB.',
    );
  }

  await prisma.productLike.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.subAdministrator.deleteMany();
  await prisma.administrator.deleteMany();

  const admin = await prisma.administrator.create({
    data: { email: 'rating-admin@test.local', passwordHash: 'x', name: 'Rating Admin' },
  });
  adminToken = signToken({ id: admin.id, email: admin.email, name: admin.name, role: 'ADMINISTRATOR' });

  const seller = await prisma.seller.create({
    data: {
      email: 'rating-seller@test.local',
      passwordHash: 'x',
      businessName: 'Rating Fixture Seller',
      contactPhone: '+250780000050',
    },
  });
  sellerToken = signToken({ id: seller.id, email: seller.email, name: seller.businessName, role: 'SELLER' });

  const category = await prisma.category.create({
    data: { name: 'Rating Fixtures', slug: 'rating-fixtures' },
  });

  const mk = (title: string, status: 'ACTIVE' | 'PENDING') =>
    prisma.product.create({
      data: {
        title,
        description: 'Fixture.',
        price: 1000,
        district: 'Gasabo',
        condition: 'New',
        images: JSON.stringify(['https://cdn.test/a.png']),
        categoryId: category.id,
        sellerId: seller.id,
        status,
      },
    });

  productId = (await mk('Rateable Listing', 'ACTIVE')).id;
  pendingId = (await mk('Unapproved Listing', 'PENDING')).id;
});

describe('PATCH /api/products/:id/rating', () => {
  it('starts unrated, and says so with null rather than a number', async () => {
    const res = await request(app).get(`/api/products/${productId}`);
    expect(res.body.product.rating).toBeNull();
  });

  it('lets an administrator set a rating', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}/rating`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rating: 4.5 });

    expect(res.status).toBe(200);
    expect(res.body.product.rating).toBe(4.5);
  });

  it('refuses an unauthenticated caller', async () => {
    const res = await request(app).patch(`/api/products/${productId}/rating`).send({ rating: 5 });
    expect(res.status).toBe(401);
  });

  it('refuses a seller rating their own listing', async () => {
    // Ratings are the platform's judgement, not the seller's about themselves.
    const res = await request(app)
      .patch(`/api/products/${productId}/rating`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ rating: 5 });

    expect(res.status).toBe(403);
  });

  it.each([[7], [-1], [3.3]])('rejects %p as a rating', async (value) => {
    const res = await request(app)
      .patch(`/api/products/${productId}/rating`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rating: value });

    expect(res.status).toBe(400);
  });

  it('accepts null to clear it back to unrated', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}/rating`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rating: null });

    expect(res.status).toBe(200);
    expect(res.body.product.rating).toBeNull();
  });

  it('writes an audit entry', async () => {
    await request(app)
      .patch(`/api/products/${productId}/rating`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rating: 4 });

    const entry = await prisma.auditLog.findFirst({
      where: { action: 'PRODUCT_RATING_SET', targetId: productId },
      orderBy: { createdAt: 'desc' },
    });
    expect(entry).toBeTruthy();
  });

  it('404s on a listing that does not exist', async () => {
    const res = await request(app)
      .patch('/api/products/00000000-0000-0000-0000-000000000000/rating')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rating: 4 });

    expect(res.status).toBe(404);
  });
});

describe('Likes', () => {
  it('counts a like from a signed-out visitor', async () => {
    const res = await like(productId, V1);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ liked: true, likeCount: 1 });
  });

  it('does not count the same visitor twice', async () => {
    // A double tap, or two tabs open on the same listing.
    await like(productId, V1);
    const res = await like(productId, V1);
    expect(res.body.likeCount).toBe(1);
  });

  it('counts a different visitor separately', async () => {
    const res = await like(productId, V2);
    expect(res.body.likeCount).toBe(2);
  });

  it('tells a visitor whether the like is theirs', async () => {
    const mine = await request(app).get(`/api/products/${productId}/like`).set('x-visitor-key', V1);
    expect(mine.body).toEqual({ liked: true, likeCount: 2 });

    const stranger = await request(app)
      .get(`/api/products/${productId}/like`)
      .set('x-visitor-key', 'visitor-key-three-cc');
    expect(stranger.body).toEqual({ liked: false, likeCount: 2 });
  });

  it('lets a visitor take their like back', async () => {
    const res = await unlike(productId, V1);
    expect(res.body).toEqual({ liked: false, likeCount: 1 });
  });

  it('treats a second unlike as a no-op, not an error', async () => {
    const res = await unlike(productId, V1);
    expect(res.status).toBe(200);
    expect(res.body.likeCount).toBe(1);
  });

  it('refuses a like with no visitor key at all', async () => {
    const res = await like(productId);
    expect(res.status).toBe(400);
  });

  it('refuses a key too short to be one it issued', async () => {
    const res = await like(productId, 'abc');
    expect(res.status).toBe(400);
  });

  it('will not like an unapproved listing', async () => {
    // 404 rather than 403, so this cannot be used to probe for the ids of
    // listings sitting in the moderation queue.
    const res = await like(pendingId, V1);
    expect(res.status).toBe(404);
  });

  it('surfaces the count on the public listing', async () => {
    const res = await request(app).get(`/api/products/${productId}`);
    expect(res.body.product.likeCount).toBe(1);
  });

  it('surfaces the count to the seller on their own listings', async () => {
    // This is the whole point of the feature for a seller.
    const res = await request(app)
      .get('/api/products/mine')
      .set('Authorization', `Bearer ${sellerToken}`);

    const mine = res.body.products.find((p: any) => p.id === productId);
    expect(mine.likeCount).toBe(1);
    expect(mine.rating).toBe(4);
  });

  it('drops the likes when the listing is deleted', async () => {
    const doomed = await prisma.product.create({
      data: {
        title: 'Short Lived',
        description: 'Fixture.',
        price: 1000,
        district: 'Gasabo',
        condition: 'New',
        images: JSON.stringify(['https://cdn.test/a.png']),
        categoryId: (await prisma.category.findFirstOrThrow()).id,
        sellerId: (await prisma.seller.findFirstOrThrow()).id,
        status: 'ACTIVE',
      },
    });
    await like(doomed.id, V1);
    await prisma.product.delete({ where: { id: doomed.id } });

    const orphans = await prisma.productLike.count({ where: { productId: doomed.id } });
    expect(orphans).toBe(0);
  });
});
