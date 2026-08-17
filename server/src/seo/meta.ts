/**
 * Server-rendered meta tags for listing URLs.
 *
 * The frontend is a client-rendered Vite bundle, so by the time it has fetched
 * a listing and could set document.title, the crawler has already read the
 * document. Social scrapers (WhatsApp, Facebook, X, LinkedIn) never run JS at
 * all. So the tags have to be in the HTML that leaves the server.
 *
 * This rewrites the built dist/index.html per request rather than maintaining
 * a separate template: the shipped shell stays the single source of truth for
 * scripts, styles and markup, and only the head metadata is swapped.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { absoluteUrl, type SeoListing } from './listings.js';

const INDEX_HTML = path.resolve('dist', 'index.html');

let cachedHtml: string | null = null;

/**
 * The built shell only changes on redeploy, so it is read once and kept in
 * memory. Re-read every time outside production, where `npm run build` may
 * rewrite it while the server is running.
 */
async function readIndexHtml(): Promise<string | null> {
  if (cachedHtml !== null && env.NODE_ENV === 'production') return cachedHtml;
  try {
    const html = await fs.readFile(INDEX_HTML, 'utf8');
    cachedHtml = html;
    return html;
  } catch {
    // No dist/ yet - a local checkout that has not run `npm run build`.
    // Callers fall through to normal handling rather than erroring.
    return null;
  }
}

/** Escape for use inside a double-quoted HTML attribute. */
function escapeAttr(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeText(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHead(listing: SeoListing): string {
  const url = absoluteUrl(listing.path);
  const image = listing.image ? absoluteUrl(listing.image) : null;

  const tags = [
    `<title>${escapeText(listing.title)}</title>`,
    `<meta name="description" content="${escapeAttr(listing.description)}">`,
    `<link rel="canonical" href="${escapeAttr(url)}">`,
    `<meta property="og:type" content="product">`,
    `<meta property="og:site_name" content="Kigali Market">`,
    `<meta property="og:title" content="${escapeAttr(listing.title)}">`,
    `<meta property="og:description" content="${escapeAttr(listing.description)}">`,
    `<meta property="og:url" content="${escapeAttr(url)}">`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${escapeAttr(listing.title)}">`,
    `<meta name="twitter:description" content="${escapeAttr(listing.description)}">`,
  ];

  if (image) {
    tags.push(`<meta property="og:image" content="${escapeAttr(image)}">`);
    tags.push(`<meta name="twitter:image" content="${escapeAttr(image)}">`);
  }

  return tags.join('\n    ');
}

/**
 * Produce the shell with this listing's metadata in place, or null when
 * there is no built shell to rewrite.
 */
export async function renderListingHtml(listing: SeoListing): Promise<string | null> {
  const html = await readIndexHtml();
  if (html === null) return null;

  const head = buildHead(listing);

  // Drop the shell's static <title> first. Appending a second one would not
  // work - the browser and every crawler honour the first title in the
  // document, so the generic one would keep winning.
  const withoutTitle = html.replace(/<title>[\s\S]*?<\/title>\s*/i, '');

  // Same reasoning for a static description, if the shell ever gains one.
  const withoutDescription = withoutTitle.replace(
    /<meta\s+name=["']description["'][^>]*>\s*/i,
    '',
  );

  if (/<\/head>/i.test(withoutDescription)) {
    return withoutDescription.replace(/<\/head>/i, `    ${head}\n  </head>`);
  }

  // No </head> to anchor to (hand-edited shell) - prepend rather than
  // silently serving a page with no metadata at all.
  return `${head}\n${withoutDescription}`;
}
