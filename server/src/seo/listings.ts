/**
 * Listing lookups shared by the crawler-facing routes.
 *
 * Both the meta-tag injector and the sitemap need "what is publicly visible
 * right now", and they must agree: a URL advertised in the sitemap that then
 * renders fallback metadata (or 404s) is worse for indexing than never
 * listing it. Keeping both on these helpers means the definition of "public"
 * lives in exactly one place.
 *
 * Products are ordinary rows. Real-estate properties are not - they live as
 * a single JSON array inside one RealEstateContent row (sectionKey
 * 'PROPERTIES'), so "find one" means reading and scanning that array. See
 * server/src/routes/realestate.routes.ts.
 */
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { DEFAULT_PROPERTIES } from '../routes/realestate.routes.js';

export interface SeoListing {
  path: string;
  title: string;
  description: string;
  image: string | null;
  updatedAt: Date | null;
}

/** Absolute URL against PUBLIC_SITE_URL - scrapers ignore relative ones. */
export function absoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return env.PUBLIC_SITE_URL;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${env.PUBLIC_SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/**
 * Collapse a listing body into something usable as a meta description.
 * Google truncates around 160 characters; cutting on a word boundary avoids
 * ending mid-word.
 */
export function toDescription(text: string, limit = 160): string {
  const flat = (text || '').replace(/\s+/g, ' ').trim();
  if (flat.length <= limit) return flat;
  const cut = flat.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}...`;
}

function firstImage(imagesJson: string | null): string | null {
  try {
    const parsed = JSON.parse(imagesJson || '[]');
    return Array.isArray(parsed) && parsed.length ? String(parsed[0]) : null;
  } catch {
    return null;
  }
}

export async function findProductListing(id: string): Promise<SeoListing | null> {
  const product = await prisma.product.findFirst({
    where: { id, status: 'ACTIVE' },
    include: { seller: true, category: true },
  });
  if (!product) return null;

  const price = `${product.price.toLocaleString('en-US')} ${product.currency}`;
  return {
    path: `/product/${product.id}`,
    title: `${product.title} - ${price} | Kigali Market`,
    description: toDescription(
      `${product.description} Listed in ${product.district} District by ${
        product.seller?.businessName ?? 'a verified seller'
      }.`,
    ),
    image: firstImage(product.images),
    updatedAt: product.updatedAt,
  };
}

/** Every publicly listed product, for the sitemap. */
export async function listProductListings(): Promise<SeoListing[]> {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, title: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  return products.map((p) => ({
    path: `/product/${p.id}`,
    title: p.title,
    description: '',
    image: null,
    updatedAt: p.updatedAt,
  }));
}

interface RawProperty {
  id?: string;
  title?: string;
  description?: string;
  image?: string;
  location?: string;
  price?: string;
}

/**
 * Read the PROPERTIES JSON blob.
 *
 * Falls back to DEFAULT_PROPERTIES exactly as GET /api/realestate does. That
 * matters: until an administrator saves the section for the first time there
 * is no row, and those defaults are what the public site renders. Returning
 * an empty list here instead would 404 every property link the site is
 * actively showing, and omit them from the sitemap.
 */
async function readProperties(): Promise<RawProperty[]> {
  const row = await prisma.realEstateContent.findUnique({
    where: { sectionKey: 'PROPERTIES' },
  });
  if (!row) return DEFAULT_PROPERTIES as RawProperty[];
  try {
    const parsed = JSON.parse(row.content || '[]');
    return Array.isArray(parsed) ? parsed : (DEFAULT_PROPERTIES as RawProperty[]);
  } catch {
    // A hand-edited CMS row degrades to the same defaults the site would
    // render, never takes down the sitemap or a page render.
    return DEFAULT_PROPERTIES as RawProperty[];
  }
}

export async function findPropertyListing(id: string): Promise<SeoListing | null> {
  const properties = await readProperties();
  const property = properties.find((p) => p?.id === id);
  if (!property) return null;

  return {
    path: `/property/${property.id}`,
    title: `${property.title ?? 'Property'} - ${property.location ?? 'Rwanda'} | Gasabo Real Estate`,
    description: toDescription(
      `${property.description ?? ''} ${property.price ? `Price: ${property.price}.` : ''} Located in ${
        property.location ?? 'Rwanda'
      }.`,
    ),
    image: property.image ?? null,
    updatedAt: null,
  };
}

export async function listPropertyListings(): Promise<SeoListing[]> {
  const properties = await readProperties();
  return properties
    .filter((p) => typeof p?.id === 'string' && p.id.length > 0)
    .map((p) => ({
      path: `/property/${p.id}`,
      title: p.title ?? 'Property',
      description: '',
      image: null,
      updatedAt: null,
    }));
}
