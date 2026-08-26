/**
 * Catalog search regression suite.
 *
 * GET /api/products used Prisma's `contains` with no mode, which is
 * case-sensitive on PostgreSQL. Searching "macbook" returned nothing while a
 * listing titled "Apple MacBook Pro" sat in the same table - and nobody types
 * a listing's capitalisation. It mattered less while search was a small box in
 * the header; the hero search made it the main way into the catalog.
 *
 * Also pinned here: search only ever returns ACTIVE listings. A pending or
 * rejected listing must not become visible just because someone guessed a
 * word in its title.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';

let categoryId: string;

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
      email: 'search-seller@test.local',
      passwordHash: 'not-used',
      businessName: 'Search Fixture Seller',
      contactPhone: '+250780000040',
    },
  });

  const category = await prisma.category.create({
    data: { name: 'Search Fixtures', slug: 'search-fixtures' },
  });
  categoryId = category.id;

  const mk = (title: string, description: string, status: 'ACTIVE' | 'PENDING') =>
    prisma.product.create({
      data: {
        title,
        description,
        price: 100000,
        district: 'Gasabo',
        condition: 'Brand New',
        images: JSON.stringify(['https://cdn.test/a.png']),
        categoryId,
        sellerId: seller.id,
        status,
      },
    });

  await mk('Apple MacBook Pro M3 Max', 'A laptop in excellent condition.', 'ACTIVE');
  await mk('Toyota RAV4 Hybrid', 'Kigali registered, low mileage.', 'ACTIVE');
  await mk('Unapproved MacBook Air', 'Still waiting on review.', 'PENDING');
});

const search = (q: string) => request(app).get(`/api/products?search=${encodeURIComponent(q)}`);

describe('GET /api/products?search', () => {
  it('finds a listing typed in lower case', async () => {
    const res = await search('macbook');

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].title).toBe('Apple MacBook Pro M3 Max');
  });

  it('finds it typed in upper case', async () => {
    const res = await search('MACBOOK');
    expect(res.body.products).toHaveLength(1);
  });

  it('finds it typed exactly as stored', async () => {
    const res = await search('MacBook');
    expect(res.body.products).toHaveLength(1);
  });

  it('matches on the description too, case-insensitively', async () => {
    const res = await search('KIGALI REGISTERED');

    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].title).toBe('Toyota RAV4 Hybrid');
  });

  it('matches a fragment, not just whole words', async () => {
    const res = await search('rav');
    expect(res.body.products.map((p: any) => p.title)).toContain('Toyota RAV4 Hybrid');
  });

  it('does not surface unapproved listings', async () => {
    // "MacBook" appears in a PENDING listing's title as well; the moderation
    // queue must not be searchable from the storefront.
    const titles = (await search('macbook')).body.products.map((p: any) => p.title);
    expect(titles).not.toContain('Unapproved MacBook Air');
  });

  it('finds a plural by also trying the singular (macbooks -> macbook)', async () => {
    const res = await search('macbooks');
    expect(res.body.products.map((p: any) => p.title)).toContain('Apple MacBook Pro M3 Max');
  });

  it('matches every word in any order (AND across words)', async () => {
    const res = await search('apple macbook');
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].title).toBe('Apple MacBook Pro M3 Max');
  });

  it('narrows to nothing when the words never co-occur in one listing', async () => {
    // "macbook" is one listing, "toyota" another - no single listing has both.
    const res = await search('macbook toyota');
    expect(res.body.products).toEqual([]);
  });

  it('finds listings by their category name, not just title/description', async () => {
    // The category is "Search Fixtures"; "fixtures" is in no title or
    // description, so this only works if the category name is searched.
    const titles = (await search('fixtures')).body.products.map((p: any) => p.title).sort();
    expect(titles).toEqual(['Apple MacBook Pro M3 Max', 'Toyota RAV4 Hybrid']);
  });

  it('returns an empty list when nothing matches', async () => {
    const res = await search('zzzzzznothing');
    expect(res.status).toBe(200);
    expect(res.body.products).toEqual([]);
  });

  it('returns everything active when no search term is given', async () => {
    const res = await request(app).get('/api/products');
    expect(res.body.products).toHaveLength(2);
  });
});
