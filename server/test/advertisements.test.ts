/**
 * Advertisements - the admin ads section, and the Hero Slider ads that feed
 * the homepage carousel.
 *
 * The slider used to be six hardcoded images an admin could not touch. Now a
 * HERO_SLIDER ad drives it. For the homepage to pick those out and link each
 * slide, GET /advertisements has to return the type and targetUrl - the
 * serializer dropped both, so the frontend had no way to tell a slider ad
 * from a banner. These guard that shape, and the create permission.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { signToken, type AuthUser } from '../src/middleware/auth.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

let adminToken: string;
let sellerToken: string;

beforeAll(async () => {
  const passwordHash = await bcrypt.hash('pw', 10);
  const admin = await prisma.administrator.create({
    data: { email: `ad-admin-${Date.now()}@t.local`, passwordHash, name: 'Ad Admin', role: 'ADMINISTRATOR' },
  });
  adminToken = signToken({ id: admin.id, email: admin.email, name: admin.name, role: 'ADMINISTRATOR' } as AuthUser);

  const seller = await prisma.seller.create({
    data: { email: `ad-seller-${Date.now()}@t.local`, passwordHash, businessName: 'Ad Seller', contactPhone: '+250 700 000 000', district: 'Gasabo' },
  });
  sellerToken = signToken({ id: seller.id, email: seller.email, name: seller.businessName, role: 'SELLER' } as AuthUser);
});

describe('POST /api/advertisements', () => {
  it('lets an admin create a Hero Slider ad', async () => {
    const res = await request(app).post('/api/advertisements').set(auth(adminToken)).send({
      title: 'Slider Promo', type: 'HERO_SLIDER', imageUrl: '/x.png', targetUrl: 'https://example.com/',
    });
    expect(res.status).toBe(201);
    expect(res.body.banner.type).toBe('HERO_SLIDER');
    expect(res.body.banner.display.desktop.fit).toBe('fill');
    expect(res.body.banner.display.mobile.fit).toBe('fill');
  });

  it('requires a title and an image', async () => {
    const res = await request(app).post('/api/advertisements').set(auth(adminToken)).send({ type: 'HERO_SLIDER' });
    expect(res.status).toBe(400);
  });

  it('defaults to HERO_SLIDER when no type is sent', async () => {
    // The admin form no longer asks - there is one type, so it sends none.
    const res = await request(app).post('/api/advertisements').set(auth(adminToken)).send({
      title: 'No type given', imageUrl: '/z.png',
    });
    expect(res.status).toBe(201);
    expect(res.body.banner.type).toBe('HERO_SLIDER');
  });

  it('stores per-device hero image display settings', async () => {
    const display = {
      desktop: { fit: 'cover', position: 'left top', scale: 1.12, x: -8, y: 5 },
      mobile: { fit: 'contain', position: 'center bottom', scale: 0.94, x: 4, y: -6 },
    };
    const res = await request(app).post('/api/advertisements').set(auth(adminToken)).send({
      title: 'Custom fit', imageUrl: '/custom.png', display,
    });

    expect(res.status).toBe(201);
    expect(res.body.banner.display).toEqual(display);
  });

  it('sanitizes invalid display settings back into the safe range', async () => {
    const res = await request(app).post('/api/advertisements').set(auth(adminToken)).send({
      title: 'Bad fit',
      imageUrl: '/bad.png',
      display: { desktop: { fit: 'stretchy', position: 'there', scale: 99, x: -99, y: 'nope' } },
    });

    expect(res.status).toBe(201);
    expect(res.body.banner.display.desktop).toEqual({
      fit: 'fill',
      position: 'center center',
      scale: 1.35,
      x: -30,
      y: 0,
    });
  });

  it('refuses the retired banner types instead of storing an invisible ad', async () => {
    // These used to be accepted here and rendered nowhere, so an admin got a
    // saved ad that never appeared.
    for (const type of ['HOMEPAGE_BANNER', 'PROMOTIONAL_BANNER', 'FLASH_PROMO']) {
      const res = await request(app).post('/api/advertisements').set(auth(adminToken)).send({
        title: 'Retired type', type, imageUrl: '/z.png',
      });
      expect(res.status, `${type} should be rejected`).toBe(400);
    }
  });

  it('refuses a seller (no ADVERTISEMENTS permission)', async () => {
    const res = await request(app).post('/api/advertisements').set(auth(sellerToken)).send({
      title: 'x', type: 'HERO_SLIDER', imageUrl: '/x.png',
    });
    expect(res.status).toBe(403);
  });

  it('refuses an unauthenticated caller', async () => {
    const res = await request(app).post('/api/advertisements').send({ title: 'x', imageUrl: '/x.png' });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/advertisements/:id/display', () => {
  it('lets an admin tune a saved hero image without replacing it', async () => {
    const created = await request(app).post('/api/advertisements').set(auth(adminToken)).send({
      title: 'Needs tuning', imageUrl: '/needs-tuning.png',
    });
    const display = {
      desktop: { fit: 'contain', position: 'right center', scale: 1, x: 6, y: 0 },
      mobile: { fit: 'cover', position: 'center top', scale: 1.08, x: 0, y: -4 },
    };

    const res = await request(app)
      .patch(`/api/advertisements/${created.body.banner.id}/display`)
      .set(auth(adminToken))
      .send({ display });

    expect(res.status).toBe(200);
    expect(res.body.banner.image).toBe('/needs-tuning.png');
    expect(res.body.banner.display).toEqual(display);
  });

  it('refuses a seller (no ADVERTISEMENTS permission)', async () => {
    const created = await request(app).post('/api/advertisements').set(auth(adminToken)).send({
      title: 'Seller cannot tune', imageUrl: '/seller-no.png',
    });
    const res = await request(app)
      .patch(`/api/advertisements/${created.body.banner.id}/display`)
      .set(auth(sellerToken))
      .send({ display: { desktop: { fit: 'contain' } } });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/advertisements', () => {
  it('returns type and targetUrl, which the homepage slider needs', async () => {
    await request(app).post('/api/advertisements').set(auth(adminToken)).send({
      title: 'Has target', type: 'HERO_SLIDER', imageUrl: '/y.png', targetUrl: 'https://kigalimarket.com/',
    });
    const res = await request(app).get('/api/advertisements');
    expect(res.status).toBe(200);
    const hero = res.body.banners.find((b: any) => b.title === 'Has target');
    expect(hero, 'the hero ad is not in the list').toBeTruthy();
    // Both fields were dropped by the old serializer - the frontend could not
    // pick a slider ad out of the list, nor link its slide.
    expect(hero.type).toBe('HERO_SLIDER');
    expect(hero.targetUrl).toBe('https://kigalimarket.com/');
    expect(hero.image).toBe('/y.png');
    expect(hero.display.desktop.fit).toBe('fill');
  });

  it('is public - no auth needed, since the homepage reads it', async () => {
    const res = await request(app).get('/api/advertisements');
    expect(res.status).toBe(200);
  });
});
