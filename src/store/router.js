/**
 * KIGALI MARKET PLATFORM - URL routing for individual listings.
 *
 * Before this, every view lived at "/" and opening a listing only pushed a
 * modal onto the page. That meant a listing could not be linked to, shared,
 * bookmarked, or crawled - Google had exactly one URL to index for the whole
 * marketplace, and every social share previewed as the generic homepage.
 *
 * Routes:
 *   /                  marketplace (default)
 *   /product/:id       marketplace with that listing's detail open
 *   /property/:id      real estate with that property's detail open
 *   #/admin-portal     admin portal (unchanged - a hash, see main.js)
 *
 * The admin portal deliberately stays a hash route. It is not meant to be
 * discoverable, and a fragment is never sent to the server, so it cannot be
 * logged or crawled the way a path can.
 */

export const ROUTE_HOME = 'home';
export const ROUTE_PRODUCT = 'product';
export const ROUTE_PROPERTY = 'property';

// Ids are product UUIDs or real-estate "re_<timestamp>" keys. Anything else
// is treated as an unknown path rather than fetched, so a junk URL cannot
// drive an API request.
const LISTING_PATH = /^\/(product|property)\/([A-Za-z0-9_-]{1,64})\/?$/;

/** Read the current address bar into a route descriptor. */
export function parseLocation(pathname = window.location.pathname) {
  const match = pathname.match(LISTING_PATH);
  if (!match) return { kind: ROUTE_HOME, id: null };
  return { kind: match[1], id: match[2] };
}

export function pathForListing(kind, id) {
  return `/${kind}/${encodeURIComponent(id)}`;
}

/**
 * Push a new URL without reloading. Guards against pushing the URL that is
 * already showing, which would otherwise stack duplicate history entries and
 * make Back appear broken.
 */
export function pushPath(path) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
}

/**
 * Return to "/" while preserving any query string (filters, campaign tags).
 * Used when a listing detail closes.
 */
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
