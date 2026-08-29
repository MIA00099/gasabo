import { describe, it, expect } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { signToken, type AuthUser } from '../src/middleware/auth.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
let seq = 0;
const uniq = () => `${Date.now()}-${seq++}`;

async function fixtures() {
  const passwordHash = await bcrypt.hash('pw', 10);
  const admin = await prisma.administrator.create({
    data: { email: `mod-admin-${uniq()}@test.local`, passwordHash, name: 'Moderation Admin' },
  });
  const seller = await prisma.seller.create({
    data: {
      email: `mod-seller-${uniq()}@test.local`,
      passwordHash,
      businessName: 'Moderated Seller',
      contactPhone: '+250788111222',
      district: 'Gasabo',
    },
  });
  const approver = await prisma.subAdministrator.create({
    data: {
      email: `mod-approver-${uniq()}@test.local`,
      passwordHash,
      name: 'Product Approver',
      permissions: JSON.stringify(['PRODUCT_APPROVAL']),
      createdById: admin.id,
    },
  });
  const category = await prisma.category.create({
    data: { name: `Moderated Category ${uniq()}`, slug: `moderated-category-${uniq()}` },
  });
  const product = await prisma.product.create({
    data: {
      title: 'Live listing',
      description: 'Already visible listing.',
      price: 1000,
      district: 'Gasabo',
      condition: 'New',
      images: JSON.stringify(['/uploads/live.png']),
      sellerId: seller.id,
      categoryId: category.id,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    product,
    category,
    approver,
    sellerToken: signToken({ id: seller.id, email: seller.email, name: seller.businessName, role: 'SELLER' } as AuthUser),
    adminToken: signToken({ id: admin.id, email: admin.email, name: admin.name, role: 'ADMINISTRATOR' } as AuthUser),
  };
}

const updateBody = (categoryId: string) => ({
  title: 'Edited live listing',
  description: 'Changed after going live.',
  price: 1200,
  district: 'Gasabo',
  condition: 'Used',
  images: ['/uploads/live-2.png'],
  categoryId,
});

describe('PUT /api/products/:id moderation', () => {
  it('returns an active seller-edited listing to pending review and notifies product approvers', async () => {
    const { product, category, approver, sellerToken } = await fixtures();

    const res = await request(app)
      .put(`/api/products/${product.id}`)
      .set(auth(sellerToken))
      .send(updateBody(category.id));

    expect(res.status).toBe(200);
    expect(res.body.product.status).toBe('pending');

    const stored = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(stored.status).toBe('PENDING');

    const note = await prisma.notification.findFirst({
      where: { recipientId: approver.id, type: 'PRODUCT_APPROVAL_NEEDED', message: { contains: 'Edited live listing' } },
    });
    expect(note).toBeTruthy();
  });

  it('keeps an administrator edit live', async () => {
    const { product, category, adminToken } = await fixtures();

    const res = await request(app)
      .put(`/api/products/${product.id}`)
      .set(auth(adminToken))
      .send(updateBody(category.id));

    expect(res.status).toBe(200);
    expect(res.body.product.status).toBe('active');
  });
});
