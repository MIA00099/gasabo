import { Router } from 'express';
import { prisma } from '../config/db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

export const advertisementsRouter = Router();

const DISPLAY_FITS = new Set(['fill', 'cover', 'contain']);
const DISPLAY_POSITIONS = new Set([
  'center center',
  'left center',
  'right center',
  'center top',
  'center bottom',
  'left top',
  'right top',
  'left bottom',
  'right bottom',
]);
const DISPLAY_DEFAULT_MODE = { fit: 'fill', position: 'center center', scale: 1, x: 0, y: 0 };
const DISPLAY_SCALE_MIN = 0.75;
const DISPLAY_SCALE_MAX = 1.35;
const DISPLAY_OFFSET_MIN = -30;
const DISPLAY_OFFSET_MAX = 30;

function plainObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeDisplayMode(value: unknown, fallback = DISPLAY_DEFAULT_MODE) {
  const raw = plainObject(value);
  const fit = typeof raw.fit === 'string' && DISPLAY_FITS.has(raw.fit) ? raw.fit : fallback.fit;
  const position = typeof raw.position === 'string' && DISPLAY_POSITIONS.has(raw.position) ? raw.position : fallback.position;

  return {
    fit,
    position,
    scale: clampNumber(raw.scale, DISPLAY_SCALE_MIN, DISPLAY_SCALE_MAX, fallback.scale),
    x: clampNumber(raw.x, DISPLAY_OFFSET_MIN, DISPLAY_OFFSET_MAX, fallback.x),
    y: clampNumber(raw.y, DISPLAY_OFFSET_MIN, DISPLAY_OFFSET_MAX, fallback.y),
  };
}

function normalizeImageDisplay(value: unknown) {
  const raw = plainObject(value);
  const hasModeKeys = raw.desktop !== undefined || raw.mobile !== undefined;
  if (!hasModeKeys) {
    const mode = normalizeDisplayMode(raw);
    return { desktop: mode, mobile: mode };
  }

  const desktop = normalizeDisplayMode(raw.desktop);
  const mobile = normalizeDisplayMode(raw.mobile, desktop);
  return { desktop, mobile };
}

function serializeAdvertisement(a: any) {
  return {
    id: a.id,
    title: a.title,
    subtitle: a.type.replace(/_/g, ' '),
    // type, targetUrl, and display are what let the homepage pick out the
    // HERO_SLIDER ads, link each slide, and fit each uploaded image.
    type: a.type,
    image: a.imageUrl,
    targetUrl: a.targetUrl || null,
    display: normalizeImageDisplay(a.imageDisplay),
    status: a.status,
    startDate: a.startDate,
    endDate: a.endDate,
  };
}

advertisementsRouter.get('/', async (_req, res) => {
  const ads = await prisma.advertisement.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({
    banners: ads.map(serializeAdvertisement),
  });
});

// HERO_SLIDER is the only ad placement the storefront reads now. The Flash
// Deals side rail is live product content, not an uploaded ad slot. The old
// HOMEPAGE_BANNER, PROMOTIONAL_BANNER, and FLASH_PROMO types rendered nowhere,
// so anything else is rejected rather than quietly kept where no one sees it.
const AD_TYPE = 'HERO_SLIDER';

advertisementsRouter.post('/', requireAuth, requirePermission('ADVERTISEMENTS'), async (req, res) => {
  const { title, type, imageUrl, targetUrl, startDate, endDate, display, imageDisplay } = req.body || {};
  if (!title || !imageUrl) return res.status(400).json({ error: 'Banner title and image are required.' });
  const adType = type || AD_TYPE;
  if (adType !== AD_TYPE) {
    return res.status(400).json({ error: `Unsupported ad type "${type}". Supported type: ${AD_TYPE}.` });
  }

  const ad = await prisma.advertisement.create({
    data: {
      title,
      type: adType,
      imageUrl,
      targetUrl,
      imageDisplay: normalizeImageDisplay(display ?? imageDisplay),
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      status: 'ACTIVE',
    },
  });
  res.status(201).json({ banner: serializeAdvertisement(ad) });
});

advertisementsRouter.patch('/:id/display', requireAuth, requirePermission('ADVERTISEMENTS'), async (req, res) => {
  const display = normalizeImageDisplay(req.body?.display ?? req.body?.imageDisplay);
  const ad = await prisma.advertisement.update({
    where: { id: req.params.id },
    data: { imageDisplay: display },
  }).catch(() => {
    throw new Error('Banner not found or already deleted.');
  });
  res.json({ banner: serializeAdvertisement(ad) });
});

// Unlike categories/sellers, deleting a banner doesn't cascade to any other
// record and isn't structural data - it's marketing content, low-risk and
// easily recreated. Direct delete (same pattern as products), not the
// multi-admin approval workflow.
advertisementsRouter.delete('/:id', requireAuth, requirePermission('ADVERTISEMENTS'), async (req, res) => {
  await prisma.advertisement.delete({ where: { id: req.params.id } }).catch(() => {
    throw new Error('Banner not found or already deleted.');
  });
  res.json({ success: true });
});
