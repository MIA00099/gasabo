/**
 * KIGALI MARKET PLATFORM - URL routing.
 *
 * Mirrors the page flow of the delivered mockups (nmm/*.html), which navigate
 * between separate documents. In this single-page app each of those becomes a
 * path:
 *
 *   index.html          ->  /
 *   products.html       ->  /products          category / listing grid
 *   product-detail.html ->  /product/:id       single listing
 *   stores.html         ->  /stores            verified seller directory
 *   post-ad.html        ->  /post-ad           post an ad
 *   auth.html           ->  /auth              login + sign up
 *   help-center.html    ->  /help-center       buying/selling safety help
 *   faq.html            ->  /faqs              frequently asked questions
 *   about.html          ->  /about             about Kigali Market
 *   terms.html          ->  /terms             terms & conditions
 *   privacy.html        ->  /privacy           privacy policy
 *   contact.html        ->  /contact           contact form
 *   (real estate)       ->  /property/:id      single property
 *
 * The admin portal stays on its #/admin-portal hash: it is deliberately
 * undiscoverable, and a fragment is never sent to the server.
 */

export const ROUTE_HOME = 'home';
export const ROUTE_PRODUCT = 'product';
export const ROUTE_PROPERTY = 'property';
export const ROUTE_PRODUCTS = 'products';
export const ROUTE_STORES = 'stores';
export const ROUTE_POST_AD = 'post-ad';
export const ROUTE_AUTH = 'auth';
export const ROUTE_HELP_CENTER = 'help-center';
export const ROUTE_FAQS = 'faqs';
export const ROUTE_ABOUT = 'about';
export const ROUTE_TERMS = 'terms';
export const ROUTE_PRIVACY = 'privacy';
export const ROUTE_CONTACT = 'contact';

// Listing ids are product UUIDs or real-estate "re_<timestamp>" keys.
// Anything else is treated as unknown rather than fetched, so a junk URL
// cannot drive an API request.
const LISTING_PATH = /^\/(product|property)\/([A-Za-z0-9_-]{1,64})\/?$/;

const FLAT_ROUTES = {
  '/products': ROUTE_PRODUCTS,
  '/stores': ROUTE_STORES,
  '/post-ad': ROUTE_POST_AD,
  '/auth': ROUTE_AUTH,
  '/help-center': ROUTE_HELP_CENTER,
  '/faqs': ROUTE_FAQS,
  '/about': ROUTE_ABOUT,
  '/terms': ROUTE_TERMS,
  '/privacy': ROUTE_PRIVACY,
  '/contact': ROUTE_CONTACT,
};

/** Read the current address bar into a route descriptor. */
export function parseLocation(pathname = window.location.pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/';

  const listing = clean.match(LISTING_PATH);
  if (listing) return { kind: listing[1], id: listing[2] };

  const flat = FLAT_ROUTES[clean];
  if (flat) return { kind: flat, id: null };

  return { kind: ROUTE_HOME, id: null };
}

export function pathForListing(kind, id) {
  return `/${kind}/${encodeURIComponent(id)}`;
}

/** Path for one of the flat pages. */
export function pathForRoute(kind) {
  const entry = Object.entries(FLAT_ROUTES).find(([, v]) => v === kind);
  return entry ? entry[0] : '/';
}

/**
 * Push a new URL without reloading. Guards against pushing the URL already
 * showing, which would stack duplicate history entries and make Back appear
 * broken.
 */
export function pushPath(path) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
}

/** Return to "/" while preserving any query string (filters, campaign tags). */
export function pushHome() {
  const target = `/${window.location.search || ''}`;
  if (window.location.pathname === '/') return;
  window.history.pushState({}, '', target);
}

/** Subscribe to Back/Forward. Returns an unsubscribe function. */
export function onRouteChange(handler) {
  const listener = () => handler(parseLocation());
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}
