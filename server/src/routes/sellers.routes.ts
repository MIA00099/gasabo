import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { isEmailTaken } from '../utils/accountEmail.js';
import { notifyAdmins } from '../utils/notify.js';
import { generateTemporaryPassword } from '../utils/passwords.js';

export const sellersRouter = Router();

// GET /api/sellers/public - the storefront seller directory (stores page).
//
// Unauthenticated on purpose: this is the public "Verified Sellers & Stores"
// listing, and a shopper has to be able to browse sellers and reach them
// before they have an account.
//
// It is a separate endpoint rather than an unauthenticated branch of GET /
// below, because that one returns the full admin record - email, status,
// lastLoginAt, every listing regardless of state. Selecting fields explicitly
// here means a column added to Seller later cannot silently become public:
//
//   exposed   businessName, district, contactPhone, joined date, listings
//   withheld  email, passwordHash, status, lastLoginAt
//
// contactPhone IS exposed - this is a classifieds marketplace where buyers
// contact sellers directly, the mockups' store cards show it, and sellers
// publish it on every listing already. Nothing else identifying is.
//
// MUST stay declared above '/:id' style routes so "public" is not read as an id.
sellersRouter.get('/public', async (_req, res) => {
  const sellers = await prisma.seller.findMany({
    // Suspended sellers are not shown, and neither are their listings.
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      businessName: true,
      contactPhone: true,
      district: true,
      createdAt: true,
      products: {
        // Only what the marketplace itself shows - a pending or rejected
        // listing must not become visible by way of the seller directory.
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          price: true,
          currency: true,
          images: true,
          district: true,
          category: { select: { id: true, name: true } },
        },
      },
    },
  });

  res.json({
    sellers: sellers.map((s) => {
      const products = s.products.map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        currency: p.currency,
        district: p.district,
        category: p.category?.name ?? null,
        categoryId: p.category?.id ?? null,
        image: (() => {
          try {
            const parsed = JSON.parse(p.images || '[]');
            return Array.isArray(parsed) && parsed.length ? String(parsed[0]) : null;
          } catch {
            return null;
          }
        })(),
      }));

      // Distinct categories this seller actually trades in, for the store
      // card's "Categories Offered" chips.
      const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

      return {
        id: s.id,
        name: s.businessName,
        phone: s.contactPhone,
        district: s.district,
        memberSince: s.createdAt,
        productCount: products.length,
        categories,
        products,
      };
    }),
  });
});

sellersRouter.get('/', requireAuth, requirePermission('SELLERS'), async (_req, res) => {
  const sellers = await prisma.seller.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { products: true } } },
  });
  res.json({
    sellers: sellers.map((s) => ({
      id: s.id,
      name: s.businessName,
      email: s.email,
      phone: s.contactPhone,
      district: s.district,
      status: s.status.toLowerCase(),
      joinedDate: s.createdAt,
      productsCount: s._count.products,
    })),
  });
});

sellersRouter.post('/:id/reset-password', requireAuth, requirePermission('SELLERS'), async (req, res) => {
  const seller = await prisma.seller.findUnique({ where: { id: req.params.id } });
  if (!seller) return res.status(404).json({ error: 'Seller not found.' });

  const tempPassword = generateTemporaryPassword();
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.default.hash(tempPassword, 10);
  await prisma.seller.update({ where: { id: seller.id }, data: { passwordHash } });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'SELLER_PASSWORD_RESET',
    module: 'Seller Admin',
    targetId: seller.id,
    details: `Reset password for seller ${seller.businessName}.`,
  });

  res.json({ success: true, tempPassword });
});

const changeEmailSchema = z.object({ email: z.string().email() });

sellersRouter.post('/:id/change-email', requireAuth, requirePermission('SELLERS'), async (req, res) => {
  const parsed = changeEmailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A valid email address is required.' });

  const seller = await prisma.seller.findUnique({ where: { id: req.params.id } });
  if (!seller) return res.status(404).json({ error: 'Seller not found.' });

  if (parsed.data.email !== seller.email && (await isEmailTaken(parsed.data.email, seller.id, 'seller'))) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const oldEmail = seller.email;
  const updated = await prisma.seller.update({ where: { id: seller.id }, data: { email: parsed.data.email } });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'SELLER_EMAIL_CHANGED',
    module: 'Seller Admin',
    targetId: seller.id,
    details: `Changed email for ${seller.businessName} from ${oldEmail} to ${updated.email}.`,
  });

  res.json({ email: updated.email });
});

// Toggles ACTIVE <-> SUSPENDED. Unlike deletion this is reversible and doesn't
// destroy any data, so it's a direct action (like password reset) rather than
// going through the multi-admin approval workflow. This was previously
// unreachable from any admin action even though login already checks for it
// (server/src/routes/auth.routes.ts blocks SUSPENDED sellers from signing in).
sellersRouter.post('/:id/toggle-status', requireAuth, requirePermission('SELLERS'), async (req, res) => {
  const seller = await prisma.seller.findUnique({ where: { id: req.params.id } });
  if (!seller) return res.status(404).json({ error: 'Seller not found.' });

  const newStatus = seller.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
  const updated = await prisma.seller.update({ where: { id: seller.id }, data: { status: newStatus } });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: newStatus === 'SUSPENDED' ? 'SELLER_SUSPENDED' : 'SELLER_REACTIVATED',
    module: 'Seller Admin',
    targetId: seller.id,
    details: `${newStatus === 'SUSPENDED' ? 'Suspended' : 'Reactivated'} seller ${seller.businessName}.`,
  });

  res.json({ status: updated.status.toLowerCase() });
});

sellersRouter.post('/:id/request-delete', requireAuth, requirePermission('SELLERS'), async (req, res) => {
  const seller = await prisma.seller.findUnique({ where: { id: req.params.id } });
  if (!seller) return res.status(404).json({ error: 'Seller not found.' });

  const request = await prisma.approvalRequest.create({
    data: {
      actionType: 'DELETE_SELLER_ACCOUNT',
      targetName: `Seller: ${seller.businessName} (ID: ${seller.id})`,
      targetId: seller.id,
      requestedById: req.user!.id,
      requestedByName: req.user!.name,
      requestedByEmail: req.user!.email,
      reason: req.body?.reason || 'Account deletion initiated by administrator.',
      riskLevel: 'HIGH',
    },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'CRITICAL_APPROVAL_REQUESTED',
    module: 'Multi-Admin Approvals',
    targetId: request.id,
    details: `Created approval request ${request.id} to delete seller "${seller.businessName}".`,
  });

  await notifyAdmins({
    type: 'APPROVAL_REQUEST_CREATED',
    message: `${req.user!.name} requested deletion of seller "${seller.businessName}" - needs a second Administrator's approval.`,
  });

  res.status(201).json({ request });
});
