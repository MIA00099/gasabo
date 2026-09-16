import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { app } from '../src/app.js';

const madeFiles = new Set<string>();

async function writeUploadImage(filename: string): Promise<string> {
  const uploadDir = path.resolve('server', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, filename);
  await sharp({
    create: {
      width: 640,
      height: 360,
      channels: 3,
      background: '#0B5D1E',
    },
  })
    .png()
    .toFile(filePath);
  madeFiles.add(filePath);
  return `/uploads/${filename}`;
}

afterEach(async () => {
  await Promise.all([...madeFiles].map((file) => fs.unlink(file).catch(() => {})));
  madeFiles.clear();
});

describe('GET /api/images/optimized', () => {
  it('serves a resized immutable WebP variant for local uploads', async () => {
    const src = await writeUploadImage(`optimizer-${Date.now()}.png`);

    const res = await request(app)
      .get('/api/images/optimized')
      .query({ src, w: 240, q: 70 })
      .set('Accept', 'image/webp');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^image\/webp\b/);
    expect(res.headers['cache-control']).toContain('max-age=31536000');
    expect(res.headers.vary).toContain('Accept');

    const meta = await sharp(res.body).metadata();
    expect(meta.width).toBe(240);
    expect(meta.format).toBe('webp');
  });

  it('uses AVIF when the browser advertises support', async () => {
    const src = await writeUploadImage(`optimizer-avif-${Date.now()}.png`);

    const res = await request(app)
      .get('/api/images/optimized')
      .query({ src, w: 160 })
      .set('Accept', 'image/avif,image/webp');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^image\/avif\b/);

    const meta = await sharp(res.body).metadata();
    expect(meta.width).toBe(160);
    expect(meta.format).toBe('heif');
  });

  it('rejects sources outside the uploads image allowlist', async () => {
    const res = await request(app)
      .get('/api/images/optimized')
      .query({ src: '/uploads/../package.json', w: 240 });

    expect(res.status).toBe(404);
  });
});
