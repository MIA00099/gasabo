/**
 * Vitest global setup - DESTRUCTIVE-TEST SAFETY GUARD.
 *
 * server/test/foundations.test.ts (and any future suite) calls deleteMany()
 * on every table with no WHERE clause. There is no separate test database
 * wired up by default: server/src/config/db.ts constructs a bare
 * `new PrismaClient()`, which reads DATABASE_URL straight out of .env - and
 * .env points at the live Supabase Postgres serving production. Running
 * `npm test` without this guard silently wipes real data (administrators,
 * sellers, products, approval history, audit logs), and `npm run db:seed`
 * does NOT restore it - seed writes demo fixtures, not your real rows.
 *
 * The README's claim that tests run against a throwaway SQLite file is stale;
 * it predates the Supabase migration (commit c9aad87).
 *
 * This file runs before any test module is imported (see vitest.config.ts
 * setupFiles), so setting process.env.DATABASE_URL here wins: dotenv.config()
 * in server/src/config/env.ts does not override already-set vars.
 *
 * Policy is fail-closed - tests abort unless ALL of these hold:
 *   1. .env.test exists
 *   2. it defines DATABASE_URL
 *   3. that URL differs from the one in .env (i.e. is not production)
 *   4. it explicitly opts in with ALLOW_DESTRUCTIVE_DB_TESTS=yes
 * Any ambiguity aborts rather than guessing.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const ROOT = path.resolve(__dirname, '..', '..');
const ENV_FILE = path.join(ROOT, '.env');
const ENV_TEST_FILE = path.join(ROOT, '.env.test');

function abort(reason: string): never {
  const message = [
    '',
    '═══════════════════════════════════════════════════════════════════',
    '  REFUSING TO RUN DESTRUCTIVE TESTS',
    '═══════════════════════════════════════════════════════════════════',
    '',
    `  ${reason}`,
    '',
    '  These tests DELETE every row in every table. Without an isolated',
    '  test database they would destroy production data, and `npm run',
    '  db:seed` cannot restore it (it writes demo fixtures, not your',
    '  real records).',
    '',
    '  To enable them, create a .env.test file at the repo root:',
    '',
    '      DATABASE_URL="postgresql://<user>:<pw>@<host>:5432/<db>"',
    '      DIRECT_URL="postgresql://<user>:<pw>@<host>:5432/<db>"',
    '      ALLOW_DESTRUCTIVE_DB_TESTS=yes',
    '',
    '  It MUST point at a scratch database you are happy to wipe -',
    '  a separate Supabase project, or a local Postgres, NOT the one',
    '  in .env. See .env.test.example.',
    '',
    '  Then apply the schema to it once:',
    '      npx dotenv -e .env.test -- prisma migrate deploy',
    '',
    '═══════════════════════════════════════════════════════════════════',
    '',
  ].join('\n');
  throw new Error(message);
}

// Read the production URL directly from the file rather than via
// dotenv.config(), so we can compare against it without loading it into
// process.env and accidentally making it the active connection.
const productionUrl = fs.existsSync(ENV_FILE)
  ? (dotenv.parse(fs.readFileSync(ENV_FILE)).DATABASE_URL || '').trim()
  : '';

if (!fs.existsSync(ENV_TEST_FILE)) {
  abort('No .env.test file found, so there is no isolated test database.');
}

const testEnv = dotenv.parse(fs.readFileSync(ENV_TEST_FILE));
const testUrl = (testEnv.DATABASE_URL || '').trim();

if (!testUrl) {
  abort('.env.test exists but does not define DATABASE_URL.');
}

if (testEnv.ALLOW_DESTRUCTIVE_DB_TESTS !== 'yes') {
  abort('.env.test does not set ALLOW_DESTRUCTIVE_DB_TESTS=yes (explicit opt-in required).');
}

if (productionUrl && testUrl === productionUrl) {
  abort('.env.test DATABASE_URL is identical to the one in .env - that is production.');
}

// Belt-and-braces: an inherited shell DATABASE_URL must not survive and
// silently become the target once dotenv declines to override it.
if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== testUrl) {
  if (productionUrl && process.env.DATABASE_URL.trim() === productionUrl) {
    abort('DATABASE_URL is already set in your shell to the production URL.');
  }
}

// Point every downstream consumer (Prisma client, env.ts) at the test DB.
for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] = value;
}

const redacted = testUrl.replace(/\/\/[^@]+@/, '//***:***@');
console.log(`[test-safety] Isolated test database confirmed: ${redacted}`);
