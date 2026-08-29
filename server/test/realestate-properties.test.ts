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

  it('stores the YouTube video id from a watch link', async () => {
    const res = await addProperty({ title: 'With tour', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(res.body.properties[0].videoId).toBe('dQw4w9WgXcQ');
  });

  it('accepts a youtu.be short link', async () => {
    const res = await addProperty({ title: 'Short link', videoUrl: 'https://youtu.be/abc123DEF45' });
    expect(res.body.properties[0].videoId).toBe('abc123DEF45');
  });

  it('stores null videoId when the link is not a YouTube URL', async () => {
    const res = await addProperty({ title: 'No video', videoUrl: 'https://vimeo.com/12345' });
    expect(res.body.properties[0].videoId).toBeNull();
  });

  it('updates and clears the YouTube video id on edit', async () => {
    const created = await addProperty({ title: 'Editable tour', videoUrl: 'https://youtu.be/abc123DEF45' });
    const id = created.body.properties[0].id;

    const updated = await request(app)
      .put(`/api/realestate/properties/${id}`)
      .set(auth(adminToken))
      .send({ title: 'Editable tour', images: ['/uploads/a.jpg'], videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

    expect(updated.status).toBe(200);
    expect(updated.body.properties.find((p: { id: string }) => p.id === id).videoId).toBe('dQw4w9WgXcQ');

    const cleared = await request(app)
      .put(`/api/realestate/properties/${id}`)
      .set(auth(adminToken))
      .send({ title: 'Editable tour', images: ['/uploads/a.jpg'], videoUrl: '' });

    expect(cleared.body.properties.find((p: { id: string }) => p.id === id).videoId).toBeNull();
  });
});

describe('POST /api/realestate/inquiries', () => {
  it('turns a public inquiry into admin notifications and audit', async () => {
    await prisma.notification.deleteMany({ where: { type: 'REALESTATE_INQUIRY' } });

    const res = await request(app).post('/api/realestate/inquiries').send({
      name: 'Prospect Buyer',
      phone: '+250788222333',
      message: 'Looking for a house in Gasabo.',
      propertyTitle: 'Family Home',
    });

    expect(res.status).toBe(201);
    const note = await prisma.notification.findFirst({
      where: { type: 'REALESTATE_INQUIRY', message: { contains: '+250788222333' } },
    });
    expect(note).toBeTruthy();

    const audit = await prisma.auditLog.findFirst({ where: { action: 'REALESTATE_INQUIRY_SUBMITTED', actorName: 'Prospect Buyer' } });
    expect(audit).toBeTruthy();
  });

  it('validates required contact fields', async () => {
    const res = await request(app).post('/api/realestate/inquiries').send({ name: 'A' });
    expect(res.status).toBe(400);
  });
});
