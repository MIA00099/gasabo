/**
 * SEO / crawler-surface regression suite.
 *
 * Covers the routing overhaul: the public single-listing endpoint, the
 * per-listing HTML pages, and the generated sitemap.
 *
 * Two of these exist because the bug actually happened while building the
 * feature, not because it was hypothetical:
 *
 *  - GET /api/products/:id was first declared above the literal '/mine' and
 *    '/pending' routes and swallowed both. Express matches in registration
 *    order, so re-ordering that file silently breaks two authenticated
 *    endpoints while every other test keeps passing.
 *
 *  - The property lookup returned [] when no PROPERTIES CMS row existed,
 *    while GET /api/realestate falls back to DEFAULT_PROPERTIES. On a fresh
 *    deployment the site therefore rendered property cards whose URLs all
 *    404'd, and the sitemap omitted them.
 *
 * The HTML-rendering assertions need a built dist/index.html to rewrite, so
 * they are skipped when the project has not been built. Everything that
 * covers the two bugs above runs regardless.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';

const HAS_DIST = fs.existsSync(path.resolve('dist', 'index.html'));

let activeProductId: string;
let pendingProductId: string;

beforeAll(async () => {
  if (process.env.ALLOW_DESTRUCTIVE_DB_TESTS !== 'yes') {
    throw new Error(
      'Refusing to wipe the database: safety guard did not run. ' +
        'Expected server/test/setup.ts to have validated an isolated test DB.',
    );
  }

  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.subAdministrator.deleteMany();
  await prisma.administrator.deleteMany();
  // No PROPERTIES row - this is the fresh-deployment state the fallback
  // behaviour below depends on.
  await prisma.realEstateContent.deleteMany();

  const seller = await prisma.seller.create({
    data: {
      email: 'seo-seller@test.local',
      passwordHash: 'not-used',
      businessName: 'SEO Fixture Seller',
      contactPhone: '+250780000002',
    },
  });
  const category = await prisma.category.create({
    data: { name: 'SEO Fixtures', slug: 'seo-fixtures' },
  });

  const active = await prisma.product.create({
    data: {
      title: 'Indexable Listing',
      description: 'A listing that is live and should be crawlable.',
      price: 12345,
      sellerId: seller.id,
      categoryId: category.id,
      status: 'ACTIVE',
    },
  });
  activeProductId = active.id;

  const pending = await prisma.product.create({
    data: {
      title: 'Unmoderated Listing',
      description: 'Still awaiting review - must not be public.',
      price: 999,
      sellerId: seller.id,
      categoryId: category.id,
      status: 'PENDING',
    },
  });
  pendingProductId = pending.id;
});

describe('Route ordering: /:id must not swallow the literal product routes', () => {
  // Both are authenticated, so 401 proves the request reached their guards.
  // If '/:id' were registered above them it would answer first and return
  // 404 "Listing not found" instead - the endpoints would look merely
  // missing rather than broken.
  it('leaves GET /api/products/mine reachable', async () => {
    const res = await request(app).get('/api/products/mine');
    expect(res.status).toBe(401);
  });

  it('leaves GET /api/products/pending reachable', async () => {
    const res = await request(app).get('/api/products/pending');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/products/:id', () => {
  it('returns an active listing', async () => {
    const res = await request(app).get(`/api/products/${activeProductId}`);
    expect(res.status).toBe(200);
    expect(res.body.product.id).toBe(activeProductId);
    expect(res.body.product.title).toBe('Indexable Listing');
  });

  it('does NOT expose a pending listing to the public', async () => {
    // Guessing the URL of something still in moderation must not work.
    const res = await request(app).get(`/api/products/${pendingProductId}`);
    expect(res.status).toBe(404);
  });

  it('404s an unknown id', async () => {
    const res = await request(app).get('/api/products/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('GET /sitemap.xml', () => {
  it('is served as XML', async () => {
    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/xml/);
  });

  it('lists the site root and every active listing', async () => {
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain('<loc>https://www.kigalimarket.com/</loc>');
    expect(res.text).toContain(`/product/${activeProductId}`);
  });

  it('omits listings that are not publicly visible', async () => {
    // A sitemap entry for a pending listing would advertise a URL that 404s,
    // which is worse for indexing than never listing it.
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).not.toContain(pendingProductId);
  });

  it('includes the default properties when no CMS row exists yet', async () => {
    // Fresh deployment: GET /api/realestate serves DEFAULT_PROPERTIES, so the
    // site renders those cards and their URLs must resolve.
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain('/property/prop_1');
  });

  it('is valid enough to parse: one urlset, balanced url entries', async () => {
    const res = await request(app).get('/sitemap.xml');
    const opens = (res.text.match(/<url>/g) || []).length;
    const closes = (res.text.match(/<\/url>/g) || []).length;
    expect(opens).toBe(closes);
    expect(opens).toBeGreaterThan(1);
    expect(res.text).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });
});

describe('GET /robots.txt', () => {
  it('points crawlers at the sitemap and keeps them out of the API', async () => {
    const res = await request(app).get('/robots.txt');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Sitemap: https://www.kigalimarket.com/sitemap.xml');
    expect(res.text).toContain('Disallow: /api/');
  });
});

describe('Listing pages', () => {
  it('404s a product URL that does not resolve', async () => {
    // Must be a hard 404. Answering 200 with the generic shell creates a
    // soft-404: Google indexes the URL as real, then reports it as a
    // duplicate of the homepage.
    const res = await request(app).get('/product/no-such-listing');
    expect(res.status).toBe(404);
  });

  it('404s a property URL that does not resolve', async () => {
    const res = await request(app).get('/property/no-such-property');
    expect(res.status).toBe(404);
  });

  it('does not expose a pending listing as a crawlable page', async () => {
    const res = await request(app).get(`/product/${pendingProductId}`);
    expect(res.status).toBe(404);
  });

  it.skipIf(!HAS_DIST)('injects the listing title, and only one <title>', async () => {
    const res = await request(app).get(`/product/${activeProductId}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);

    const titles = res.text.match(/<title>[\s\S]*?<\/title>/g) || [];
    // The shell ships its own generic title. Appending a second one would
    // not work - browsers and crawlers honour the first in the document -
    // so the original must be removed, not supplemented.
    expect(titles).toHaveLength(1);
    expect(titles[0]).toContain('Indexable Listing');
  });

  it.skipIf(!HAS_DIST)('injects canonical and Open Graph tags with absolute URLs', async () => {
    const res = await request(app).get(`/product/${activeProductId}`);

    expect(res.text).toContain(
      `<link rel="canonical" href="https://www.kigalimarket.com/product/${activeProductId}">`,
    );
    expect(res.text).toContain('property="og:title"');
    expect(res.text).toContain('property="og:description"');
    expect(res.text).toContain(
      `<meta property="og:url" content="https://www.kigalimarket.com/product/${activeProductId}">`,
    );
  });

  it.skipIf(!HAS_DIST)('serves a property page from the default CMS content', async () => {
    const res = await request(app).get('/property/prop_1');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Modern 4-Bedroom Villa');
  });

  it.skipIf(!HAS_DIST)('emits valid Product structured data with a price', async () => {
    // This is what makes a listing eligible for Google's rich product
    // results - the price shown in the search listing itself. It must be one
    // JSON-LD block, valid JSON, of @type Product with an Offer carrying a
    // numeric price and currency.
    const res = await request(app).get(`/product/${activeProductId}`);

    const blocks = res.text.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
    expect(blocks, 'expected exactly one JSON-LD block on a product page').toHaveLength(1);

    const raw = blocks[0].replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '').replace(/<\\\//g, '</');
    const data = JSON.parse(raw); // throws if the injection produced invalid JSON
    expect(data['@type']).toBe('Product');
    expect(data.offers['@type']).toBe('Offer');
    expect(typeof data.offers.price).toBe('number');
    expect(data.offers.priceCurrency).toBeTruthy();
    expect(data.offers.availability).toContain('schema.org');
  });

  it.skipIf(!HAS_DIST)('does not put a price Offer on a property (free-text price)', async () => {
    // Properties price as free text ("Rent: 800,000/mo"), which Offer.price
    // cannot represent, so they must not emit a Product/Offer with a bogus
    // number.
    const res = await request(app).get('/property/prop_1');
    const blocks = res.text.match(/<script type="application\/ld\+json">/g) || [];
    expect(blocks).toHaveLength(0);
  });

  it.skipIf(!HAS_DIST)('does not leave the shell\'s site-wide tags on a listing page', async () => {
    // The shell (index.html) now carries site-wide og:/twitter:/canonical
    // tags and an Organization/WebSite JSON-LD block for the homepage. A
    // product page injects its own, so it must strip the shell's first -
    // two og:title tags, or the homepage canonical on a product URL, is a
    // worse signal than none. This is what the strip in renderListingHtml
    // guarantees.
    const res = await request(app).get(`/product/${activeProductId}`);

    expect(res.text.match(/property="og:title"/g) || []).toHaveLength(1);
    expect(res.text.match(/<link rel="canonical"/g) || []).toHaveLength(1);
    // The product page has its own Product JSON-LD, but the homepage's
    // Organization/WebSite graph must not ride along on a product URL.
    expect(res.text).not.toContain('#organization');
    expect(res.text).not.toContain('"@type": "WebSite"');
  });
});

// The homepage is not served by the SEO router - it is the static shell -
// so these assert on the built file directly. Before this, the homepage
// (a brand's most important page for a name search) shipped with a title
// but no canonical, no Open Graph and no structured data.
describe.skipIf(!HAS_DIST)('the built homepage shell', () => {
  const shell = HAS_DIST ? fs.readFileSync(path.resolve('dist', 'index.html'), 'utf8') : '';

  it('declares a canonical URL', () => {
    expect(shell).toContain('<link rel="canonical" href="https://www.kigalimarket.com/">');
  });

  it('carries Open Graph and Twitter tags', () => {
    expect(shell).toContain('property="og:title"');
    expect(shell).toContain('property="og:image"');
    expect(shell).toContain('name="twitter:card"');
  });

  it('carries Organization + WebSite structured data', () => {
    expect(shell).toContain('application/ld+json');
    expect(shell).toContain('"@type": "Organization"');
    expect(shell).toContain('"@type": "WebSite"');
  });

  it('gives a no-JavaScript crawler real body text, not just the loader', () => {
    const noscript = shell.match(/<noscript>[\s\S]*?<\/noscript>/i)?.[0] || '';
    expect(noscript).toContain('Kigali Market');
    expect(noscript.toLowerCase()).toContain('buy');
    expect(noscript.toLowerCase()).toContain('sell');
  });
});
