import { describe, it, expect } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { signToken, type AuthUser } from '../src/middleware/auth.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const png1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

describe('POST /api/uploads', () => {
  it('stores a real image for a seller', async () => {
    const passwordHash = await bcrypt.hash('pw', 10);
    const seller = await prisma.seller.create({
      data: {
        email: `upload-seller-${Date.now()}@test.local`,
        passwordHash,
        businessName: 'Upload Seller',
        contactPhone: '+250788000001',
      },
    });
    const token = signToken({ id: seller.id, email: seller.email, name: seller.businessName, role: 'SELLER' } as AuthUser);

    const res = await request(app)
      .post('/api/uploads')
      .set(auth(token))
      .attach('image', png1x1, { filename: 'tiny.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^\/uploads\/.*\.png$/);

    await fs.unlink(path.resolve('server', res.body.url.slice(1))).catch(() => {});
  });

  it('rejects a fake image even when the MIME type says image/jpeg', async () => {
    const passwordHash = await bcrypt.hash('pw', 10);
    const seller = await prisma.seller.create({
      data: {
        email: `fake-upload-${Date.now()}@test.local`,
        passwordHash,
        businessName: 'Fake Upload Seller',
        contactPhone: '+250788000002',
      },
    });
    const token = signToken({ id: seller.id, email: seller.email, name: seller.businessName, role: 'SELLER' } as AuthUser);

    const res = await request(app)
      .post('/api/uploads')
      .set(auth(token))
      .attach('image', Buffer.from('not really an image'), { filename: 'fake.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/supported image format/i);
  });

  it('does not let a plain platform user upload admin or listing media', async () => {
    const token = signToken({
      id: 'user-without-upload-rights',
      email: 'plain-user@test.local',
      name: 'Plain User',
      role: 'USER',
    } as AuthUser);

    const res = await request(app)
      .post('/api/uploads')
      .set(auth(token))
      .attach('image', png1x1, { filename: 'tiny.png', contentType: 'image/png' });

    expect(res.status).toBe(403);
  });
});
