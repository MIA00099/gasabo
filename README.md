# Kigali Market Platform

Rwandan marketplace + Gasabo Real Estate corporate site, with an admin/RBAC layer.
Frontend is a vanilla-JS SPA (Vite); backend is Express + Prisma + PostgreSQL.

## Running locally

Two servers run side by side in development:

```bash
npm install

# One-time setup: create local PostgreSQL databases on port 5433
npm run db:test:init

# Load demo data into the local development database
npm run dev:seed

# Terminal 1 - backend API (port 3001)
npm run dev:api

# Terminal 2 - frontend dev server (port 5173, proxies /api to the backend)
npm run dev
```

Then open http://localhost:5173.

## Demo accounts

Seeded by `npm run db:seed`. All accounts share the password **`Kigali@2026`**.

| Role | Email |
|---|---|
| Administrator | `admin@kigalimarket.com` |
| Sub-Administrator | `divine@kigalimarket.com` |
| Seller | `eric.m@rwandaagri.rw` |
| Seller | `uwase.mc@gmail.com` |
| Seller | `patrick.tech@kigali.rw` |

Log in via the header "Login" button (works for any account type above) or
register a new seller via "Start Selling" on the Marketplace page.

## Production build

```bash
npm run build   # outputs to dist/
npm run preview # serve the frontend production build locally
```

The backend has no separate build step. Production startup runs:

```bash
npm start
```

Production must provide PostgreSQL `DATABASE_URL`, direct migration `DIRECT_URL`,
and a strong `JWT_SECRET` of at least 32 characters. `PUBLIC_SITE_URL` controls
canonical, Open Graph, sitemap and robots URLs. `CORS_ORIGIN` is optional; when
unset in production, the API allows only `PUBLIC_SITE_URL`.

## Tests

```bash
npm test
npm run test:e2e
```

The Vitest suite is destructive, but it is guarded: it refuses to run unless
`.env.test` points at a local PostgreSQL database and sets
`ALLOW_DESTRUCTIVE_DB_TESTS=yes`. Use `npm run db:test:init` to provision that
local database.

## Backups

The admin backup action writes timestamped Prisma JSON snapshots to
`server/backups/`, which is gitignored and not served publicly. Treat those
files as sensitive because they include account password hashes.
