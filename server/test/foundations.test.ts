import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';

describe('Module 1: Foundations & Data Models Test Suite', () => {
  beforeAll(async () => {
    // Defense in depth. server/test/setup.ts (wired via vitest.config.ts
    // setupFiles) is the primary guard that keeps the deleteMany() calls
    // below off the production database; it sets this variable only after
    // confirming an isolated test DB. Re-checking it here means that if
    // setupFiles is ever removed, renamed, or misconfigured, this suite
    // refuses to run rather than silently wiping real data.
    if (process.env.ALLOW_DESTRUCTIVE_DB_TESTS !== 'yes') {
      throw new Error(
        'Refusing to wipe the database: safety guard did not run. ' +
          'Expected server/test/setup.ts to have validated an isolated test DB ' +
          '(see vitest.config.ts setupFiles and .env.test.example).'
      );
    }

    // Ensure clean test database state
    await prisma.notification.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.realEstateContent.deleteMany();
    await prisma.advertisement.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.seller.deleteMany();
    await prisma.platformUser.deleteMany();
    await prisma.subAdministrator.deleteMany();
    await prisma.administrator.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Health Check Endpoint returns status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('Data Model 1 & 2: Can create Administrator and SubAdministrator with permissions', async () => {
    const admin = await prisma.administrator.create({
      data: {
        email: 'superadmin@kigalimarket.com',
        passwordHash: '$2a$10$hashedpasswordstring',
        name: 'Super Admin',
      },
    });
    expect(admin.id).toBeDefined();
    expect(admin.role).toBe('ADMINISTRATOR');

    const subAdmin = await prisma.subAdministrator.create({
      data: {
        email: 'subadmin@kigalimarket.com',
        passwordHash: '$2a$10$hashedsubadminpassword',
        name: 'Sub Admin Marketplace',
        permissions: JSON.stringify(['PRODUCTS', 'SELLERS']),
        createdById: admin.id,
      },
    });
    expect(subAdmin.id).toBeDefined();
    expect(subAdmin.createdById).toBe(admin.id);
    expect(JSON.parse(subAdmin.permissions)).toContain('PRODUCTS');
  });

  it('Data Model 3 & 4: Can create PlatformUser and Seller', async () => {
    const user = await prisma.platformUser.create({
      data: {
        email: 'buyer@example.com',
        passwordHash: '$2a$10$hashedbuyerpassword',
        name: 'Jane Buyer',
        roles: JSON.stringify(['USER']),
      },
    });
    expect(user.id).toBeDefined();
    expect(user.status).toBe('ACTIVE');

    const seller = await prisma.seller.create({
      data: {
        email: 'seller@example.com',
        passwordHash: '$2a$10$hashedsellerpassword',
        businessName: 'Kigali Electronics',
        contactPhone: '+250788000111',
      },
    });
    expect(seller.id).toBeDefined();
    expect(seller.status).toBe('ACTIVE');
  });

  it('Data Model 5 & 6: Can create Category and Product with Seller relation', async () => {
    const seller = await prisma.seller.findFirstOrThrow();

    const category = await prisma.category.create({
      data: {
        name: 'Electronics',
        slug: 'electronics',
        iconUrl: '/icons/electronics.svg',
      },
    });
    expect(category.id).toBeDefined();

    const product = await prisma.product.create({
      data: {
        title: 'Smartphone X',
        description: 'Brand new smartphone',
        price: 250000,
        currency: 'RWF',
        sellerId: seller.id,
        categoryId: category.id,
        isFeatured: true,
        isTrending: true,
      },
    });
    expect(product.id).toBeDefined();
    expect(product.sellerId).toBe(seller.id);
    expect(product.categoryId).toBe(category.id);
  });

  it('Data Model 7: Can create Advertisement', async () => {
    const ad = await prisma.advertisement.create({
      data: {
        title: 'Summer Sale Promo',
        type: 'HERO_SLIDER',
        imageUrl: '/images/promo.jpg',
        targetUrl: 'https://kigalimarket.com/promo',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
    });
    expect(ad.id).toBeDefined();
    expect(ad.type).toBe('HERO_SLIDER');
  });

  it('Data Model 8: Can create AuditLog linked to Administrator', async () => {
    const admin = await prisma.administrator.findFirstOrThrow();

    const log = await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorType: 'ADMINISTRATOR',
        action: 'CREATE_CATEGORY',
        module: 'CATEGORIES',
        details: JSON.stringify({ categoryName: 'Electronics' }),
        ipAddress: '127.0.0.1',
      },
    });
    expect(log.id).toBeDefined();
    expect(log.actorId).toBe(admin.id);
  });

  it('Data Model 9: Can create RealEstateContent section', async () => {
    const content = await prisma.realEstateContent.create({
      data: {
        sectionKey: 'HOMEPAGE',
        content: JSON.stringify({ heroTitle: 'Gasabo Luxury Estates', contactPhone: '+250788222333' }),
      },
    });
    expect(content.id).toBeDefined();
    expect(content.sectionKey).toBe('HOMEPAGE');
  });

  it('Data Model 10: Can create Notification', async () => {
    const notification = await prisma.notification.create({
      data: {
        recipientType: 'ADMIN',
        type: 'NEW_SELLER_REGISTRATION',
        message: 'New seller registered: Kigali Electronics',
      },
    });
    expect(notification.id).toBeDefined();
    expect(notification.isRead).toBe(false);
  });
});
