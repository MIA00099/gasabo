import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Runs before any test module is imported. Refuses to let the
    // destructive suites run against a non-isolated (i.e. production)
    // database, and points Prisma at the scratch DB from .env.test.
    // See server/test/setup.ts for the full rationale.
    setupFiles: ['./server/test/setup.ts'],
  },
});
