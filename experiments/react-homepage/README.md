# React homepage migration experiment

This is an **isolated proof of concept**, not a replacement for the existing Kigali Market homepage. The existing frontend, API, database, routing, authentication and deployment are unchanged.

## Run locally

1. Start the existing Express API at port 3001 using the root project instructions.
2. `cd experiments/react-homepage`
3. `npm install`
4. `npm run dev` (Vite port 5174)

The prototype requests categories and products independently and keeps stable section placeholders. It intentionally does not yet reproduce the existing homepage design, hero, filters, Flash Deals, seller flows, or image behavior.

## Before production migration

- Confirm actual `/api/products` response schema and pagination parameters against the running API.
- Match all current UX and responsive layouts without losing functionality.
- Preserve routing, auth, permissions, SEO and Capacitor compatibility.
- Profile network waterfalls, main-thread work, layout shifts and LCP on real mobile hardware.
- Add integration/E2E tests and compare against the existing implementation.
- Decide whether public product pages require SSR or prerendering.
- Migrate progressively only after tests and review.

Do not deploy this experiment as the live website.
