/**
 * Category icon regression suite.
 *
 * Category.iconUrl holds either an emoji ("📦") or an uploaded image URL, and
 * both forms are live at once: every category created before icon uploads
 * existed still holds an emoji, and no migration can turn one into the other.
 * So the column has to keep accepting both, and PATCH must not quietly assume
 * one shape.
 *
 * PATCH /:id/icon takes effect directly rather than going through the
 * multi-admin approval workflow that deletion uses. That is deliberate - a
 * wrong logo is fixed by uploading the right one, where a deleted category
 * cascades into listed products - but it does mean the permission check is the
 * only thing standing in front of it, so it is tested here.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { signToken } from '../src/middleware/auth.js';

const IMAGE_ICON = 'https://example.supabase.co/storage/v1/object/public/product-images/logo.png';

let adminToken: string;
let emojiCategoryId: string;

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
  await prisma.subAdministrator.deleteMany();
  await prisma.administrator.deleteMany();

  const admin = await prisma.administrator.create({
    data: {
      email: 'category-admin@test.local',
      passwordHash: 'not-used',
      name: 'Category Admin',
    },
  });
  adminToken = signToken({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: 'ADMINISTRATOR',
  });

  const emojiCategory = await prisma.category.create({
    data: { name: 'Emoji Era Category', slug: 'emoji-era-category', iconUrl: '🚗' },
  });
  emojiCategoryId = emojiCategory.id;
});

describe('POST /api/categories', () => {
  it('accepts an uploaded image URL as the icon', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Uploaded Logo Category', icon: IMAGE_ICON });

    expect(res.status).toBe(201);
    expect(res.body.category.icon).toBe(IMAGE_ICON);
  });

  it('still accepts an emoji, so the old flow is not broken', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Emoji Category', icon: '🎁' });

    expect(res.status).toBe(201);
    expect(res.body.category.icon).toBe('🎁');
  });
});

describe('PATCH /api/categories/:id/icon', () => {
  it('requires authentication', async () => {
    const res = await request(app)
      .patch(`/api/categories/${emojiCategoryId}/icon`)
      .send({ icon: IMAGE_ICON });

    expect(res.status).toBe(401);
  });

  it('replaces an emoji icon with an uploaded image', async () => {
    const res = await request(app)
      .patch(`/api/categories/${emojiCategoryId}/icon`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ icon: IMAGE_ICON });

    expect(res.status).toBe(200);
    expect(res.body.category.icon).toBe(IMAGE_ICON);

    const stored = await prisma.category.findUnique({ where: { id: emojiCategoryId } });
    expect(stored?.iconUrl).toBe(IMAGE_ICON);
  });

  it('leaves the name and ordering alone', async () => {
    const before = await prisma.category.findUnique({ where: { id: emojiCategoryId } });

    await request(app)
      .patch(`/api/categories/${emojiCategoryId}/icon`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ icon: '🚙' });

    const after = await prisma.category.findUnique({ where: { id: emojiCategoryId } });
    expect(after?.name).toBe(before?.name);
    expect(after?.slug).toBe(before?.slug);
    expect(after?.order).toBe(before?.order);
    expect(after?.iconUrl).toBe('🚙');
  });

  it('rejects an empty icon rather than blanking the column', async () => {
    const res = await request(app)
      .patch(`/api/categories/${emojiCategoryId}/icon`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ icon: '' });

    expect(res.status).toBe(400);

    const stored = await prisma.category.findUnique({ where: { id: emojiCategoryId } });
    expect(stored?.iconUrl).toBe('🚙');
  });

  it('404s on a category that does not exist', async () => {
    const res = await request(app)
      .patch('/api/categories/00000000-0000-0000-0000-000000000000/icon')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ icon: IMAGE_ICON });

    expect(res.status).toBe(404);
  });

  it('writes an audit entry, because an icon is the category public face', async () => {
    await request(app)
      .patch(`/api/categories/${emojiCategoryId}/icon`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ icon: IMAGE_ICON });

    const entry = await prisma.auditLog.findFirst({
      where: { action: 'CATEGORY_ICON_CHANGED', targetId: emojiCategoryId },
      orderBy: { createdAt: 'desc' },
    });
    expect(entry).toBeTruthy();
  });
});

describe('GET /api/categories', () => {
  it('serves emoji and image icons side by side', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);

    const icons = res.body.categories.map((c: any) => c.icon);
    expect(icons).toContain('🎁');
    expect(icons).toContain(IMAGE_ICON);
  });
});

describe('GET /api/categories default seeding', () => {
  // The handler used to re-seed 11 default categories on EVERY request - eleven
  // sequential DB round trips that made the endpoint take ~10s and, worse,
  // re-created any default an admin had deleted on the next page load. Seeding
  // now only runs when the table is empty.
  it('does not seed the defaults when the table already has categories', async () => {
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.category.create({ data: { name: 'Only One', slug: 'only-one', iconUrl: '📦' } });

    await request(app).get('/api/categories');

    const cats = await prisma.category.findMany();
    // A single count()-guarded path: the 11 defaults must NOT be injected.
    expect(cats).toHaveLength(1);
    expect(cats[0].name).toBe('Only One');
  });

  it('still seeds the defaults on a genuinely empty table (fresh DB)', async () => {
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();

    const res = await request(app).get('/api/categories');

    const names = res.body.categories.map((c: any) => c.name);
    expect(names).toContain('Electronics & Tech');
    expect(names.length).toBeGreaterThanOrEqual(11);
  });
});

describe('POST /api/categories duplicate handling', () => {
  // This is the bug an admin actually hit in production: the category "Books"
  // existed, they typed "books", and got a 500 reading "Something went wrong
  // on our end". The duplicate guard was findUnique on `name` - case
  // sensitive, so "books" walked past it - while slugify() lowercases, so the
  // insert hit the unique constraint on `slug` and threw P2002 with nothing
  // to catch it.
  beforeAll(async () => {
    await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Books', icon: '📚' });
  });

  it('409s on the same name in a different case, not 500', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'books', icon: '📚' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('409s on the exact same name', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Books', icon: '📚' });

    expect(res.status).toBe(409);
  });

  it('409s when two different names slugify to the same value', async () => {
    // "Books!!!" -> "books", which "Books" already owns.
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Books!!!', icon: '📚' });

    expect(res.status).toBe(409);
  });

  it('does not create a second row for any of those attempts', async () => {
    const rows = await prisma.category.findMany({
      where: { name: { in: ['Books', 'books', 'Books!!!'] } },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Books');
  });

  it('still creates a genuinely new category', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Musical Instruments', icon: '🎸' });

    expect(res.status).toBe(201);
    expect(res.body.category.name).toBe('Musical Instruments');
  });
});
