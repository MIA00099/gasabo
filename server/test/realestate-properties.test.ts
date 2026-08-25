/**
 * Gasabo Real Estate properties carry a gallery, not a single photo.
 *
 * The add-property form now uploads several images; the endpoint stores them
 * as an `images` array while keeping `image` as the primary/thumbnail so every
 * card and link that reads `prop.image` still renders. These guard that an
 * uploaded gallery is persisted in order, that a legacy single `image` still
 * works, that blank entries are dropped, and that an empty gallery falls back
 * to the placeholder.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { signToken, type AuthUser } from '../src/middleware/auth.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

let adminToken: string;

async function addProperty(body: Record<string, unknown>) {
  return request(app).post('/api/realestate/properties').set(auth(adminToken)).send(body);
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash('pw', 10);
  const admin = await prisma.administrator.create({
    data: { email: `re-admin-${Date.now()}@t.local`, passwordHash, name: 'RE Admin', role: 'ADMINISTRATOR' },
  });
  adminToken = signToken({ id: admin.id, email: admin.email, name: admin.name, role: 'ADMINISTRATOR' } as AuthUser);
});

describe('POST /api/realestate/properties (multi-image)', () => {
  it('stores an uploaded gallery in order and uses the first as the cover', async () => {
    const images = ['/uploads/a.jpg', '/uploads/b.jpg', '/uploads/c.jpg'];
    const res = await addProperty({ title: 'Villa with gallery', type: 'house', images });

    expect(res.status).toBe(201);
    const created = res.body.properties[0];
    expect(created.images).toEqual(images);
    expect(created.image).toBe('/uploads/a.jpg'); // primary = first
  });

  it('still accepts a legacy single image and mirrors it into images[]', async () => {
    const res = await addProperty({ title: 'Legacy single', type: 'plot', image: '/uploads/only.jpg' });

    const created = res.body.properties[0];
    expect(created.image).toBe('/uploads/only.jpg');
    expect(created.images).toEqual(['/uploads/only.jpg']);
  });

  it('drops blank/whitespace entries from the gallery', async () => {
    const res = await addProperty({
      title: 'Messy gallery',
      images: ['/uploads/a.jpg', '', '   ', '/uploads/b.jpg'],
    });

    const created = res.body.properties[0];
    expect(created.images).toEqual(['/uploads/a.jpg', '/uploads/b.jpg']);
    expect(created.image).toBe('/uploads/a.jpg');
  });

  it('falls back to the placeholder when no photos are given', async () => {
    const res = await addProperty({ title: 'No photos' });

    const created = res.body.properties[0];
    expect(created.image).toBe('/real-estate-logo.png');
    expect(created.images).toEqual(['/real-estate-logo.png']);
  });

  it('rejects an unauthenticated caller', async () => {
    const res = await request(app).post('/api/realestate/properties').send({ title: 'No auth', images: ['/x.jpg'] });
    expect(res.status).toBe(401);
  });
});
