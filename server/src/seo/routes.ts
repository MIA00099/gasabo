/**
 * Crawler-facing routes: per-listing HTML with real metadata, and the
 * sitemap that advertises those URLs.
 *
 * Mounted BEFORE express.static and before the SPA catch-all in app.ts.
 * Order matters twice over:
 *   - /sitemap.xml must beat any static file of the same name, so the
 *     generated one wins over a stale copy in dist/.
 *   - /product/:id must beat the catch-all, which would otherwise return the
 *     generic shell with no listing metadata.
 */
import { Router } from 'express';
import { env } from '../config/env.js';
import {
  absoluteUrl,
  findProductListing,
  findPropertyListing,
  listProductListings,
  listPropertyListings,
} from './listings.js';
import { renderListingHtml } from './meta.js';

export const seoRouter = Router();

type Finder = (id: string) => Promise<Awaited<ReturnType<typeof findProductListing>>>;

/**
 * Serve the SPA shell with this listing's metadata injected.
 *
 * A missing listing returns 404 while still serving the app, so the visitor
 * gets the working UI and the crawler gets a hard 404. Returning 200 with the
 * generic shell would create soft-404s - Google indexes the URL as a real
 * page and then reports it as a duplicate of the homepage.
 */
function listingPage(find: Finder) {
  return async (req: any, res: any, next: any) => {
    const listing = await find(req.params.id);

    if (!listing) {
      // No such listing. Hand off to the catch-all for the shell, but pin the
      // status first so it cannot be served as 200.
      res.status(404);
      return next();
    }

    const html = await renderListingHtml(listing);
    // No dist/ built yet (local dev against Vite) - let the normal handling
    // take over instead of failing the request.
    if (html === null) return next();

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  };
}

seoRouter.get('/product/:id', listingPage(findProductListing));
seoRouter.get('/property/:id', listingPage(findPropertyListing));

function xmlEscape(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc: string, lastmod: Date | null, changefreq: string, priority: string): string {
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

// GET /sitemap.xml - generated per request from whatever is currently public.
// Listings appear and expire continuously (see utils/productExpiry.ts), so a
// file written at build time would start going stale immediately.
seoRouter.get('/sitemap.xml', async (_req, res) => {
  const [products, properties] = await Promise.all([
    listProductListings(),
    listPropertyListings(),
  ]);

  const entries = [
    urlEntry(absoluteUrl('/'), null, 'daily', '1.0'),
    ...products.map((p) => urlEntry(absoluteUrl(p.path), p.updatedAt, 'weekly', '0.8')),
    ...properties.map((p) => urlEntry(absoluteUrl(p.path), p.updatedAt, 'weekly', '0.7')),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');

  res.set('Content-Type', 'application/xml; charset=utf-8');
  // Regenerated on demand but cheap to serve repeatedly; a short cache keeps
  // an aggressive crawler from running two queries per hit.
  res.set('Cache-Control', 'public, max-age=300');
  res.send(xml);
});

// robots.txt is served statically from public/, but it hardcodes the
// production host. Serve it dynamically so the Sitemap line always matches
// PUBLIC_SITE_URL - otherwise a staging deploy points crawlers at production.
seoRouter.get('/robots.txt', (_req, res) => {
  const body = [
    `# ${env.PUBLIC_SITE_URL}`,
    '',
    'User-agent: *',
    'Allow: /',
    '',
    '# The JSON API is not useful to crawlers and should not appear in results.',
    'Disallow: /api/',
    '',
    `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
    '',
  ].join('\n');

  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(body);
});
