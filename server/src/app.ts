// Must be imported before any router/route is registered - it patches Express 4's
// internal Route/Layer classes so a rejected promise from an async handler is
// forwarded to next(err) instead of crashing the process as an unhandled rejection.
// (A hand-rolled version of this patched the wrong object - Router.prototype, which
// is unrelated to the actual prototype Router() instances use - and was a silent
// no-op the whole time. This package patches the real internal classes correctly.)
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { authRouter } from './routes/auth.routes.js';
import { productsRouter } from './routes/products.routes.js';
import { categoriesRouter } from './routes/categories.routes.js';
import { sellersRouter } from './routes/sellers.routes.js';
import { realEstateRouter } from './routes/realestate.routes.js';
import { approvalsRouter } from './routes/approvals.routes.js';
import { auditRouter } from './routes/audit.routes.js';
import { advertisementsRouter } from './routes/advertisements.routes.js';
import { rbacRouter } from './routes/rbac.routes.js';
import { uploadsRouter } from './routes/uploads.routes.js';
import { imagesRouter } from './routes/images.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';
import { contactRouter } from './routes/contact.routes.js';
import { seoRouter } from './seo/routes.js';
import { env } from './config/env.js';

export const app = express();

app.disable('x-powered-by');

app.use((_req, res, next) => {
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const corsOrigins = env.CORS_ORIGIN
  ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim().replace(/\/+$/, '')).filter(Boolean)
  : env.NODE_ENV === 'production'
    ? [env.PUBLIC_SITE_URL]
    : null;

// The Capacitor native app (see capacitor.config.ts / MOBILE_APP.md) is served
// from one of these fixed WebView origins, never a real web page - a browser
// tab cannot forge them - so they are always allowed alongside CORS_ORIGIN.
const NATIVE_APP_ORIGINS = [
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'https://localhost',
];

app.use(cors({
  origin(origin, callback) {
    if (
      !origin
      || corsOrigins === null
      || corsOrigins.includes(origin.replace(/\/+$/, ''))
      || NATIVE_APP_ORIGINS.includes(origin.replace(/\/+$/, ''))
    ) {
      return callback(null, true);
    }
    return callback(null, false);
  },
}));
app.use(express.json({ limit: '1mb' }));

// Public read endpoints are safe to cache briefly at browsers/CDNs. Keep
// authenticated/admin traffic private so permissions and account changes are
// never served from a stale shared cache.
app.use('/api', (req, res, next) => {
  const isPublicRead = req.method === 'GET' && !req.headers.authorization && (
    req.path.startsWith('/products') ||
    req.path.startsWith('/categories') ||
    req.path.startsWith('/advertisements') ||
    req.path.startsWith('/realestate')
  );
  if (isPublicRead) {
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300');
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

// Serves files saved by uploadsRouter (POST /api/uploads) - e.g. a saved
// file at server/uploads/169..-abc.jpg becomes reachable at /uploads/169..-abc.jpg.
app.use('/uploads', express.static(path.resolve('server', 'uploads'), {
  maxAge: '1y',
  immutable: true,
}));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/sellers', sellersRouter);
app.use('/api/realestate', realEstateRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/advertisements', advertisementsRouter);
app.use('/api/rbac', rbacRouter);
app.use('/api/images', imagesRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/contact', contactRouter);

// 404 handler for unmatched /api routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

// Crawler-facing routes: /product/:id and /property/:id (the SPA shell with
// per-listing metadata injected), plus a generated /sitemap.xml and
// /robots.txt. Registered here deliberately - ahead of express.static so the
// generated sitemap beats any file of the same name left in dist/, and ahead
// of the catch-all below, which would otherwise answer every listing URL with
// the generic shell and no metadata.
app.use(seoRouter);

// Serve the built frontend (npm run build -> dist/) from this same Express
// process - this is what lets one Railway service host both the API and the
// site on one origin, so the frontend's relative fetch('/api/...') calls
// keep working in production with no CORS/absolute-URL rework. Inert in
// local dev: the dev workflow runs Vite's own server on :5173 for the
// frontend and never asks this Express process for a non-API route, and
// dist/ won't even exist yet before the first `npm run build`.
const distDir = path.resolve('dist');

const SPA_ROUTES = new Set([
  '/',
  '/products',
  '/stores',
  '/post-ad',
  '/auth',
  '/reset-password',
  '/flash-deals',
  '/help-center',
  '/faqs',
  '/about',
  '/terms',
  '/privacy',
  '/contact',
]);
const LISTING_ROUTE = /^\/(?:product|property)\/[A-Za-z0-9_-]{1,64}\/?$/;

function isKnownSpaPath(requestPath: string): boolean {
  const clean = requestPath.replace(/\/+$/, '') || '/';
  return SPA_ROUTES.has(clean) || LISTING_ROUTE.test(clean);
}

function looksLikeStaticAsset(requestPath: string): boolean {
  return requestPath.startsWith('/uploads') || requestPath.startsWith('/assets') || path.extname(requestPath) !== '';
}

app.use(express.static(distDir, {
  setHeaders(res, filePath) {
    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
  },
}));
app.get('*', (req, res, next) => {
  // Static-looking misses are real missing files, not frontend routes - let
  // Express return a normal 404 instead of masquerading as index.html.
  if (looksLikeStaticAsset(req.path)) return next();

  if (!isKnownSpaPath(req.path) && res.statusCode < 400) {
    res.status(404);
  }
  if (res.statusCode >= 400) {
    res.set('X-Robots-Tag', 'noindex');
  }

  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) next(err);
  });
});

// Central error handler - guarantees JSON error responses instead of leaking stack traces
// or hanging requests when a route handler throws.
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled API error]', err);

  // Prisma can't reach the database - most commonly a serverless Postgres host
  // (e.g. Neon free tier) that auto-suspends its compute after being idle and is
  // still cold-starting. This is transient, not a bug - tell the client to retry
  // rather than returning an opaque "something went wrong".
  const isDbUnreachable =
    err?.name === 'PrismaClientInitializationError' ||
    err?.code === 'P1001' || // "Can't reach database server"
    err?.code === 'P1002' || // timed out
    err?.code === 'P1008' || // operation timed out
    err?.code === 'P1017';   // server closed the connection
  if (isDbUnreachable) {
    return res.status(503).json({ error: 'The database is temporarily unavailable (it may be waking up from idle). Please try again in a few seconds.' });
  }

  res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
});
