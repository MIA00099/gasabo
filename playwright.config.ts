import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests for the real Kigali Market app.
 *
 * These run a real browser against the actual Vite dev server (the same one
 * `npm run dev` starts on :5173), not jsdom - so they catch the class of bug
 * the unit suite cannot: the app booting into a blank loading screen because
 * something threw during render (the `extraCategories is not defined` outage
 * was exactly this). They are deliberately resilient to the API being down:
 * the page shell, header, nav and language switch all render from the frontend
 * alone, so a smoke run does not require the Express backend or a database.
 *
 * Kept separate from Vitest: Vitest owns the fast unit/integration suite under
 * src/ and server/ (see vitest.config.ts, which excludes this folder), and
 * Playwright owns the browser E2E under e2e/. Run with `npm run test:e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Start the app's own dev server for the run. If one is already up (the usual
  // local case) it is reused rather than started a second time. Set
  // E2E_BASE_URL to point the suite at a different origin (e.g. a staging URL)
  // and this stays out of the way.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
