/**
 * Multi-image listing regression suite.
 *
 * Product.images has always been a JSON array and the detail page has always
 * had a thumbnail gallery, but the seller form only ever collected one photo
 * and stateEngine flattened it to `[image]`, so every listing arrived with a
 * single entry and the gallery never appeared. The form now collects up to
 * ten.
 *
 * The cap is enforced here rather than only in the form, because the form is
 * not the security boundary - a seller can post to this endpoint directly.
 * Ten is the number the UI has always advertised ("Max 10 photos").
 *
 * Order matters and is preserved: the first image is the cover shown in the
 * marketplace grid, in the seller's own dashboard row, and in the related
 * products rail. A listing whose photos come back shuffled would show a
 * different cover on every deploy.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { signToken } from '../src/middleware/auth.js';

const IMG = (n: number) => `https://cdn.test/photo-${n}.png`;

let sellerToken: string;
let categoryId: string;

const listing = (overrides: Record<string, unknown> = {}) => ({
  title: 'Multi Image Listing',
  categoryId,
  price: 125000,
  district: 'Gasabo',
  condition: 'Brand New',
  description: 'A listing with several photos.',
  images: [IMG(1), IMG(2), IMG(3)],
  ...overrides,
});

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
      email: 'gallery-seller@test.local',
      passwordHash: 'not-used',
      businessName: 'Gallery Fixture Seller',
      contactPhone: '+250780000030',
      district: 'Gasabo',
    },
  });
  sellerToken = signToken({
    id: seller.id,
    email: seller.email,
    name: seller.businessName,
    role: 'SELLER',
  });

  const category = await prisma.category.create({
    data: { name: 'Gallery Fixtures', slug: 'gallery-fixtures' },
  });
  categoryId = category.id;
});

const post = (body: Record<string, unknown>) =>
  request(app).post('/api/products').set('Authorization', `Bearer ${sellerToken}`).send(body);

describe('POST /api/products with multiple images', () => {
  it('accepts and stores every image', async () => {
    const res = await post(listing());

    expect(res.status).toBe(201);
    expect(res.body.product.images).toEqual([IMG(1), IMG(2), IMG(3)]);
  });

  it('preserves the order the seller arranged them in', async () => {
    // The first entry is the cover everywhere it is shown, so this is not
    // cosmetic - a reordered array changes what buyers see in the grid.
    const ordered = [IMG(9), IMG(4), IMG(7), IMG(1)];
    const res = await post(listing({ title: 'Ordered Photos', images: ordered }));

    expect(res.status).toBe(201);
    expect(res.body.product.images).toEqual(ordered);
    expect(res.body.product.images[0]).toBe(IMG(9));
  });

  it('accepts exactly ten', async () => {
    const ten = Array.from({ length: 10 }, (_, i) => IMG(i));
    const res = await post(listing({ title: 'Ten Photos', images: ten }));

    expect(res.status).toBe(201);
    expect(res.body.product.images).toHaveLength(10);
  });

  it('rejects an eleventh rather than silently truncating', async () => {
    const eleven = Array.from({ length: 11 }, (_, i) => IMG(i));
    const res = await post(listing({ title: 'Eleven Photos', images: eleven }));

    expect(res.status).toBe(400);

    const stored = await prisma.product.findFirst({ where: { title: 'Eleven Photos' } });
    expect(stored).toBeNull();
  });

  it('still requires at least one photo', async () => {
    const res = await post(listing({ title: 'No Photos', images: [] }));
    expect(res.status).toBe(400);
  });

  it('rejects an empty string masquerading as a photo', async () => {
    const res = await post(listing({ title: 'Blank Photo', images: [''] }));
    expect(res.status).toBe(400);
  });

  it('round-trips the whole gallery through GET /api/products/:id', async () => {
    const gallery = [IMG(1), IMG(2), IMG(3), IMG(4), IMG(5)];
    const created = await post(listing({ title: 'Round Trip Gallery', images: gallery }));

    // A new listing is PENDING, so approve it the way an admin would before
    // reading it back from the public endpoint.
    await prisma.product.update({
      where: { id: created.body.product.id },
      data: { status: 'ACTIVE' },
    });

    const res = await request(app).get(`/api/products/${created.body.product.id}`);

    expect(res.status).toBe(200);
    expect(res.body.product.images).toEqual(gallery);
  });

  it('stores images as a JSON array, not a bare string', async () => {
    // serializeProduct JSON.parses this column. A string would arrive at the
    // gallery as a list of characters.
    const created = await post(listing({ title: 'Column Shape', images: [IMG(1), IMG(2)] }));
    const row = await prisma.product.findUnique({ where: { id: created.body.product.id } });

    const parsed = JSON.parse(row!.images);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
  });
});
