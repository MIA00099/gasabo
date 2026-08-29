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
 *   3. that URL's host is THIS MACHINE (localhost / 127.0.0.1)
 *   4. it still differs from the one in .env
 *   5. it explicitly opts in with ALLOW_DESTRUCTIVE_DB_TESTS=yes
 *   6. no non-local DATABASE_URL is inherited from the shell
 * Any ambiguity aborts rather than guessing.
 *
 * Rule 3 is the one that matters, and it replaced an earlier "must not equal
 * the URL in .env" check as the primary defence. That check was a blocklist:
 * it could only refuse the single database it had been told to avoid, it
 * fell open on any other remote host (a staging box, a second Supabase
 * project, a pasted connection string), and it was skipped altogether when
 * no .env existed - a fresh clone or a CI runner, precisely where a mistake
 * is most likely. Requiring a local host inverts that: a local database can
 * be rebuilt with `npm run db:test:init` in seconds, and nothing this suite
 * does can reach off the machine it runs on.
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
    '  The simplest fix is to let the project create a local database',
    '  for you:',
    '',
    '      npm run db:test:init',
    '',
    '  That provisions a Postgres on 127.0.0.1:5433 and applies the',
    '  schema. .env.test then reads:',
    '',
    '      DATABASE_URL="postgresql://postgres:password@localhost:5433/kigalimarket_test"',
    '      DIRECT_URL="postgresql://postgres:password@localhost:5433/kigalimarket_test"',
    '      ALLOW_DESTRUCTIVE_DB_TESTS=yes',
    '',
    '  The host MUST be localhost or 127.0.0.1. A remote database is',
    '  refused outright, however it is configured - including a scratch',
    '  cloud project. If it is not on this machine, it belongs to',
    '  somebody, and this suite deletes everything.',
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

// PRIMARY DEFENCE: the target must be a database on this machine.
//
// Everything else here is a blocklist - it can only refuse a database it
// recognises as production. That is the wrong way round. It answers "is this
// the one host I know to avoid?" when the question is "is this definitely
// safe to wipe?", and it fails open on anything it has not been told about:
// a colleague's machine, a staging box, a second Supabase project, a
// connection string pasted in by mistake.
//
// The comparison below is also skipped entirely when no .env exists - a
// fresh clone, a CI runner - which is exactly when someone is most likely to
// be pointing at a remote database by accident.
//
// So: allowlist the host instead. A local database is one you can recreate
// with `npm run db:test:init` in seconds; a remote one belongs to somebody.
// Nothing this suite does can reach off this machine.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

function hostOf(connectionString: string): string | null {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return null;
  }
}

const testHost = hostOf(testUrl);

if (testHost === null) {
  abort(`.env.test DATABASE_URL is not a URL this guard can parse, so its host cannot be verified.`);
}

if (!LOCAL_HOSTS.has(testHost)) {
  abort(
    `.env.test DATABASE_URL points at "${testHost}", which is not this machine.\n` +
      '  These tests delete every row in every table, so they are only ever\n' +
      '  allowed to run against a local database (localhost / 127.0.0.1).\n' +
      '  Run `npm run db:test:init` to create one.',
  );
}

// Secondary: even a local URL must not be the one in .env. Someone running
// Postgres locally in production would otherwise slip through the check above.
if (productionUrl && testUrl === productionUrl) {
  abort('.env.test DATABASE_URL is identical to the one in .env - that is production.');
}

// Belt-and-braces: an inherited shell DATABASE_URL must not survive and
// silently become the target once dotenv declines to override it. Checked
// against the same host allowlist rather than against production alone, so
// an exported connection string to anywhere remote is refused.
const shellUrl = (process.env.DATABASE_URL || '').trim();
if (shellUrl && shellUrl !== testUrl) {
  const shellHost = hostOf(shellUrl);
  if (shellHost === null || !LOCAL_HOSTS.has(shellHost)) {
    abort(
      'DATABASE_URL is already set in your shell to a non-local database.\n' +
        '  Unset it before running the tests.',
    );
  }
}

// Point every downstream consumer (Prisma client, env.ts) at the test DB.
for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] = value;
}

// Do not inherit production/staging storage credentials from .env during
// tests. dotenv.config() in server/src/config/env.ts will not override values
// already present here, so blanking these unless .env.test explicitly sets
// them keeps upload tests on the local disk fallback instead of a real
// Supabase bucket.
if (!('SUPABASE_URL' in testEnv)) process.env.SUPABASE_URL = '';
if (!('SUPABASE_SERVICE_ROLE_KEY' in testEnv)) process.env.SUPABASE_SERVICE_ROLE_KEY = '';

const redacted = testUrl.replace(/\/\/[^@]+@/, '//***:***@');
console.log(`[test-safety] Isolated test database confirmed: ${redacted}`);
