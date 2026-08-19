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
