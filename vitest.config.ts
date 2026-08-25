import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // The Playwright browser E2E lives in e2e/*.spec.ts and uses @playwright/test,
    // not Vitest. Vitest has no explicit include, so without this it would try to
    // run those specs and fail on the unfamiliar test API. Keep the default
    // exclusions (node_modules, dist, ...) and add the E2E folder.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    // Runs before any test module is imported. Refuses to let the
    // destructive suites run against a non-isolated (i.e. production)
    // database, and points Prisma at the scratch DB from .env.test.
    // See server/test/setup.ts for the full rationale.
    setupFiles: ['./server/test/setup.ts'],
    // Starts the local practice Postgres for the duration of the run and
    // stops it afterwards, so `npm test` needs no manually-started database.
    // This only starts the server - server/test/setup.ts still independently
    // decides (and validates) which database the tests are pointed at.
    globalSetup: ['./server/test/global-setup.ts'],
    // Every suite here starts by deleting all rows, and they share one test
    // database. Run the files one at a time so they cannot wipe each other's
    // fixtures mid-run.
    fileParallelism: false,
  },
});
