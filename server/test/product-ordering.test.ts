/**
 * The storefront must surface an admin's Featured / Trending flags.
 *
 * GET /api/products used to sort by createdAt only, so ticking "Featured" or
 * "Trending" on a listing changed nothing a shopper could see. It now orders
 * featured first, then trending, then newest - even when the featured/trending
 * ones are older than a plain listing.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';

beforeAll(async () => {
  if (process.env.ALLOW_DESTRUCTIVE_DB_TESTS !== 'yes') {
    throw new Error('Refusing to wipe the database: safety guard did not run.');
  }
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.seller.deleteMany();

  const seller = await prisma.seller.create({
    data: { email: `ord-seller-${Date.now()}@t.local`, passwordHash: 'x', businessName: 'Ord Seller', contactPhone: '+250700000050', district: 'Gasabo' },
  });
  const cat = await prisma.category.create({ data: { name: `Ord ${Date.now()}`, slug: `ord-${Date.now()}` } });

  const mk = (title: string, createdAt: Date, flags: Record<string, boolean> = {}) =>
    prisma.product.create({
      data: {
        title, description: 'x', price: 1000, district: 'Gasabo', images: '[]',
        sellerId: seller.id, categoryId: cat.id, status: 'ACTIVE', createdAt, ...flags,
      },
    });

  // Newest-first by createdAt would be: Plain, Trending, Featured.
  await mk('Featured One', new Date('2026-01-01T00:00:00Z'), { isFeatured: true });
  await mk('Trending One', new Date('2026-01-02T00:00:00Z'), { isTrending: true });
  await mk('Plain Newest', new Date('2026-01-03T00:00:00Z'));
});

describe('GET /api/products ordering', () => {
  it('returns featured, then trending, then newest', async () => {
    const res = await request(app).get('/api/products');
    const titles = res.body.products.map((p: any) => p.title);
    expect(titles).toEqual(['Featured One', 'Trending One', 'Plain Newest']);
  });
});
