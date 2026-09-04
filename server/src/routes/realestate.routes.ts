import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';
import { withDerivedPrices, priceToNumber } from '../utils/price.js';
import { notifyAdminsWithModulePermission } from '../utils/notify.js';
import { sendMail } from '../utils/email.js';

export const realEstateRouter = Router();

const DEFAULTS: Record<string, unknown> = {
  HERO: {
    title: 'Find Your Perfect Property with Gasabo Real Estate',
    subtitle: 'Your trusted partner in Rwanda for buying, selling, renting, and managing premium properties.',
    bgImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80',
  },
  ABOUT: {
    heading: 'About Gasabo Real Estate',
    text: "We are Rwanda's premier real estate agency, committed to excellence, integrity, and transparency in every transaction.",
  },
  SERVICES: [
    { icon: '🏠', title: 'Land and Houses Sales', description: 'Expert assistance in buying and selling premium properties.', featured: true },
    { icon: '🔑', title: 'House Renting', description: 'Find fully furnished, move-in ready homes tailored to your lifestyle.', featured: true },
    { icon: '🏢', title: 'Property Management', description: 'Comprehensive asset management, ensuring routine maintenance.', featured: false },
    { icon: '📈', title: 'Investment Advice', description: 'Strategic consulting to help maximize your real estate ROI.', featured: false },
    { icon: '📣', title: 'Marketing and Advertising', description: 'High-reach property promotion using professional video tours.', featured: false },
    { icon: '🛡️', title: 'Tenant Representation', description: 'Dedicated advocacy for tenants navigating complex leases.', featured: false },
  ],
  CONTACT: {
    address: 'Gasabo District, Kigali, Rwanda',
    phone: '0788350555',
    email: 'gasaboestaterwanda@gmail.com',
  },
};

// Individual listings (houses/plots/commercial units) - replaced the old
// developer "portfolio projects" model by request. priceNum is kept
// separate from the display price string so the price-range search filter
// (see stateEngine.js) has something numeric to compare against, same
// reasoning as Product.price in the marketplace.
// Exported because the SEO layer must agree with what the site actually
// shows. GET / below falls back to these when no PROPERTIES row exists yet,
// so on a fresh deployment they ARE the live listings - a sitemap or
// /property/:id handler that ignored them would 404 on links the site is
// rendering. See server/src/seo/listings.ts.
export const DEFAULT_PROPERTIES = [
  {
    id: 'prop_1',
    type: 'house',
    title: 'Modern 4-Bedroom Villa',
    location: 'Gasabo',
    price: '150,000,000 Rwf',
    priceNum: 150000000,
    beds: 4,
    baths: 3,
    area: '600 sqm',
    image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80',
    description: 'Stunning modern villa located in the upscale neighborhood of Gacuriro. Features a large garden, paved parking, modern kitchen, and spacious master suite.',
  },
  {
    id: 'prop_2',
    type: 'plot',
    title: 'Prime Residential Plot',
    location: 'Bugesera',
    price: '8,500,000 Rwf',
    priceNum: 8500000,
    beds: 0,
    baths: 0,
    area: '600 sqm',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
    description: 'Excellent flat land ready for construction in the fast-growing Bugesera district. Close to the main tarmac road.',
  },
];

async function getSection<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.realEstateContent.findUnique({ where: { sectionKey: key } });
  if (!row) return fallback;
  try {
    return JSON.parse(row.content) as T;
  } catch {
    return fallback;
  }
}

async function setSection(key: string, content: unknown) {
  return prisma.realEstateContent.upsert({
    where: { sectionKey: key },
    update: { content: JSON.stringify(content) },
    create: { sectionKey: key, content: JSON.stringify(content) },
  });
}

// GET /api/realestate - aggregated public content for the whole Gasabo Real Estate page
realEstateRouter.get('/', async (_req, res) => {
  const [hero, about, services, contact, properties] = await Promise.all([
    getSection('HERO', DEFAULTS.HERO),
    getSection('ABOUT', DEFAULTS.ABOUT),
    getSection('SERVICES', DEFAULTS.SERVICES),
    getSection('CONTACT', DEFAULTS.CONTACT),
    getSection('PROPERTIES', DEFAULT_PROPERTIES),
  ]);
  // Derived here as well as on write, so the listings already stored - the
  // ones whose hand-typed filter number had drifted from their price - are
  // corrected without a destructive rewrite of live data.
  res.json({ hero, about, services, contact, properties: withDerivedPrices(properties as any[]) });
});

realEstateRouter.put('/hero', requireAuth, requirePermission('REAL_ESTATE_CONTENT'), async (req, res) => {
  const { title, subtitle, bgImage } = req.body || {};
  const current = await getSection('HERO', DEFAULTS.HERO as any);
  const updated = { ...current, ...(title ? { title } : {}), ...(subtitle ? { subtitle } : {}), ...(bgImage ? { bgImage } : {}) };
  await setSection('HERO', updated);

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'REALESTATE_CMS_UPDATE',
    module: 'Real Estate Admin',
    details: 'Updated hero headline & subtitle content.',
  });

  res.json({ hero: updated });
});

const PROPERTY_TYPES = ['house', 'plot', 'commercial'];

// Pull the 11-char video id out of any common YouTube URL (watch, youtu.be,
// embed, shorts) or a bare id. Storing only the id - never the raw string - is
// what keeps the storefront's <iframe src> safe: the embed URL is rebuilt from
// this id, so a pasted value can't smuggle in an arbitrary frame source.
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  );
  if (m) return m[1];
  const bare = url.trim();
  return /^[A-Za-z0-9_-]{11}$/.test(bare) ? bare : null;
}

realEstateRouter.post('/properties', requireAuth, requirePermission('REAL_ESTATE_CONTENT'), async (req, res) => {
  const { title, type, location, price, beds, baths, area, image, images, description, videoUrl } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Property title is required.' });

  // A property is a gallery, not a single photo. `images` is the new array;
  // `image` (the old single field) is still accepted so older clients keep
  // working, and is always kept in sync as the primary/thumbnail so every card
  // and link that reads `prop.image` still renders. Falsy/blank entries are
  // dropped, and an empty gallery falls back to the house placeholder.
  const gallery = (Array.isArray(images) ? images : image ? [image] : [])
    .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    .map((u) => u.trim());
  const primaryImage = gallery[0] || '/real-estate-logo.png';

  const properties = await getSection('PROPERTIES', DEFAULT_PROPERTIES);
  const newProperty = {
    id: 're_' + Date.now(),
    type: PROPERTY_TYPES.includes(type) ? type : 'house',
    title,
    location: location || 'Gasabo',
    price: price || 'Contact for price',
    priceNum: priceToNumber(price),
    beds: Number.isFinite(beds) ? beds : 0,
    baths: Number.isFinite(baths) ? baths : 0,
    area: area || 'N/A',
    image: primaryImage,
    images: gallery.length ? gallery : [primaryImage],
    // Optional YouTube tour: the storefront shows a play badge when set and
    // embeds youtube.com/embed/<videoId>. Null when no valid link was given.
    videoId: extractYouTubeId(typeof videoUrl === 'string' ? videoUrl : '') || null,
    description: description || 'Newly listed property by Gasabo Real Estate.',
  };
  const updated = [newProperty, ...properties];
  await setSection('PROPERTIES', updated);

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'REALESTATE_PROPERTY_ADDED',
    module: 'Real Estate Admin',
    details: `Added property listing "${title}".`,
  });

  res.status(201).json({ properties: updated });
});

// Properties live as a single JSON array inside one RealEstateContent row
// (sectionKey 'PROPERTIES'), not individual DB rows - deleting one means
// reading the array, filtering it, and writing the whole array back.
realEstateRouter.delete('/properties/:id', requireAuth, requirePermission('REAL_ESTATE_CONTENT'), async (req, res) => {
  const properties = await getSection<any[]>('PROPERTIES', DEFAULT_PROPERTIES);
  const exists = properties.some((p) => p.id === req.params.id);
  if (!exists) return res.status(404).json({ error: 'Property not found.' });

  const updated = properties.filter((p) => p.id !== req.params.id);
  await setSection('PROPERTIES', updated);

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'REALESTATE_PROPERTY_DELETED',
    module: 'Real Estate Admin',
    details: `Deleted property listing (id: ${req.params.id}).`,
  });

  res.json({ properties: updated });
});

realEstateRouter.put('/properties/:id', requireAuth, requirePermission('REAL_ESTATE_CONTENT'), async (req, res) => {
  const { title, type, location, price, beds, baths, area, image, images, description, videoUrl } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Property title is required.' });

  const properties = await getSection<any[]>('PROPERTIES', DEFAULT_PROPERTIES);
  const index = properties.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Property not found.' });

  const gallery = (Array.isArray(images) ? images : image ? [image] : [])
    .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    .map((u) => u.trim());
  const primaryImage = gallery[0] || properties[index].image || '/real-estate-logo.png';

  const updatedProperty = {
    ...properties[index],
    type: PROPERTY_TYPES.includes(type) ? type : properties[index].type,
    title,
    location: location || properties[index].location,
    price: price || properties[index].price,
    priceNum: priceToNumber(price),
    beds: Number.isFinite(beds) ? beds : properties[index].beds || 0,
    baths: Number.isFinite(baths) ? baths : properties[index].baths || 0,
    area: area || properties[index].area,
    image: primaryImage,
    images: gallery.length ? gallery : [primaryImage],
    videoId: typeof videoUrl === 'string' ? extractYouTubeId(videoUrl) : properties[index].videoId ?? null,
    description: description || properties[index].description,
  };

  properties[index] = updatedProperty;
  await setSection('PROPERTIES', properties);

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'REALESTATE_PROPERTY_UPDATED',
    module: 'Real Estate Admin',
    details: `Updated property listing "${title}".`,
  });

  res.json({ properties });
});

const inquirySchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(6).max(40),
  message: z.string().max(1000).optional(),
  propertyId: z.string().max(80).optional(),
  propertyTitle: z.string().max(180).optional(),
});

realEstateRouter.post('/inquiries', async (req, res) => {
  const parsed = inquirySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter your name and phone number before sending the inquiry.', details: parsed.error.flatten() });
  }

  const inquiry = {
    name: parsed.data.name.trim(),
    phone: parsed.data.phone.trim(),
    message: parsed.data.message?.trim() || '',
    propertyId: parsed.data.propertyId?.trim() || null,
    propertyTitle: parsed.data.propertyTitle?.trim() || null,
  };
  const subject = inquiry.propertyTitle ? ` about "${inquiry.propertyTitle}"` : '';
  const body = inquiry.message ? ` Message: ${inquiry.message}` : '';

  // Durable record, the Gasabo counterpart of a ContactMessage row - what the
  // Real Estate CMS "Inquiries" panel works through. Notification + audit
  // below are the alert and the trail; this is the inbox.
  const saved = await prisma.realEstateInquiry.create({
    data: {
      name: inquiry.name,
      phone: inquiry.phone,
      message: inquiry.message || null,
      propertyId: inquiry.propertyId,
      propertyTitle: inquiry.propertyTitle,
      ipAddress: req.ip,
    },
  });

  await notifyAdminsWithModulePermission('REAL_ESTATE_CONTENT', {
    type: 'REALESTATE_INQUIRY',
    message: `${inquiry.name} (${inquiry.phone}) sent a Gasabo Real Estate inquiry${subject}.${body}`,
  });

  // Email the Gasabo contact address, the same way the marketplace contact
  // form emails env.CONTACT_EMAIL. Recipient is the CONTACT section's own
  // email (what the Real Estate footer shows), so an admin who changes it in
  // the CMS redirects inquiries too. Best-effort: no-op + log when SMTP is
  // unconfigured (see utils/email.ts); the in-app notification above and the
  // audit row below have already recorded the inquiry.
  const contactSection = (await getSection('CONTACT', DEFAULTS.CONTACT)) as { email?: string };
  const inquiryTo =
    (typeof contactSection?.email === 'string' && contactSection.email) ||
    (DEFAULTS.CONTACT as { email: string }).email;
  await sendMail({
    to: inquiryTo,
    subject: `Gasabo Real Estate inquiry${subject || ` from ${inquiry.name}`}`,
    text: [
      'New inquiry from the Gasabo Real Estate site.',
      '',
      `Name:     ${inquiry.name}`,
      `Phone:    ${inquiry.phone}`,
      inquiry.propertyTitle ? `Property: ${inquiry.propertyTitle}` : null,
      inquiry.message ? `\nMessage:\n${inquiry.message}` : null,
    ].filter((line) => line !== null).join('\n'),
  });

  await logAudit({
    actorId: 'public-realestate-inquiry',
    actorType: 'SYSTEM',
    actorName: inquiry.name,
    action: 'REALESTATE_INQUIRY_SUBMITTED',
    module: 'Real Estate',
    targetId: saved.id,
    details: inquiry,
  });

  res.status(201).json({ success: true, message: 'Inquiry received.' });
});

// --- Admin: the Real Estate CMS "Inquiries" panel (REAL_ESTATE_CONTENT) ---

const INQUIRY_STATUSES = ['NEW', 'READ', 'ARCHIVED'] as const;

function serializeInquiry(i: {
  id: string; name: string; phone: string; message: string | null;
  propertyId: string | null; propertyTitle: string | null; status: string; createdAt: Date;
}) {
  return {
    id: i.id,
    name: i.name,
    phone: i.phone,
    message: i.message || null,
    propertyId: i.propertyId || null,
    propertyTitle: i.propertyTitle || null,
    status: i.status,
    createdAt: i.createdAt,
  };
}

realEstateRouter.get('/inquiries', requireAuth, requirePermission('REAL_ESTATE_CONTENT'), async (_req, res) => {
  const inquiries = await prisma.realEstateInquiry.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ inquiries: inquiries.map(serializeInquiry) });
});

const inquiryStatusSchema = z.object({ status: z.enum(INQUIRY_STATUSES) });

realEstateRouter.patch('/inquiries/:id', requireAuth, requirePermission('REAL_ESTATE_CONTENT'), async (req, res) => {
  const parsed = inquiryStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: `Status must be one of: ${INQUIRY_STATUSES.join(', ')}.` });
  }

  const existing = await prisma.realEstateInquiry.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Inquiry not found.' });

  const updated = await prisma.realEstateInquiry.update({
    where: { id: existing.id },
    data: { status: parsed.data.status },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'REALESTATE_INQUIRY_STATUS_CHANGED',
    module: 'Real Estate',
    targetId: existing.id,
    details: `Marked Gasabo inquiry from ${existing.name} as ${parsed.data.status}.`,
  });

  res.json({ inquiry: serializeInquiry(updated) });
});

realEstateRouter.delete('/inquiries/:id', requireAuth, requirePermission('REAL_ESTATE_CONTENT'), async (req, res) => {
  const existing = await prisma.realEstateInquiry.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Inquiry not found or already deleted.' });

  await prisma.realEstateInquiry.delete({ where: { id: existing.id } });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'REALESTATE_INQUIRY_DELETED',
    module: 'Real Estate',
    targetId: existing.id,
    details: `Deleted Gasabo inquiry from ${existing.name} (${existing.phone}).`,
  });

  res.json({ success: true });
});

// Generic section editor for ABOUT / SERVICES / CONTACT

realEstateRouter.put('/:sectionKey', requireAuth, requirePermission('REAL_ESTATE_CONTENT'), async (req, res) => {
  const key = req.params.sectionKey.toUpperCase();
  if (!['ABOUT', 'SERVICES', 'CONTACT'].includes(key)) {
    return res.status(400).json({ error: 'Unknown content section.' });
  }
  await setSection(key, req.body);

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'REALESTATE_CMS_UPDATE',
    module: 'Real Estate Admin',
    details: `Updated ${key} section content.`,
  });

  res.json({ [key.toLowerCase()]: req.body });
});
