# Kigali Market Platform

Rwandan marketplace + Gasabo Real Estate corporate site, with an admin/RBAC layer.
Frontend is a vanilla-JS SPA (Vite); backend is Express + Prisma + SQLite.

## Running locally

Two servers run side by side in development:

```bash
npm install

# One-time setup: create the database and load demo data
npx prisma db push
npm run db:seed

# Terminal 1 - backend API (port 3001)
npm run server

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
npm run preview # serve the production build locally
```

The backend has no separate build step - `npm run server` runs it directly via `tsx`.

## Tests

```bash
npm test
```

Note: the test suite wipes and re-seeds its own fixture data in the same SQLite
database configured in `.env` - run `npm run db:seed` afterward if you want the
demo accounts back for manual testing.
