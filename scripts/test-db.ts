/**
 * Practice (scratch) database - lifecycle management.
 *
 * The destructive test suite needs a Postgres it is allowed to wipe. This
 * module runs one from the real Postgres binaries that `embedded-postgres`
 * vendors into node_modules, launched as a normal child process. Nothing is
 * installed system-wide and no Windows service is registered - deleting
 * node_modules and .pgdata removes every trace.
 *
 * It deliberately does NOT use port 5432, so it can never be confused with a
 * system Postgres someone installs later.
 *
 * WHY pg_ctl RATHER THAN embedded-postgres's OWN start()/stop():
 * that library spawns postgres.exe directly, and postgres.exe refuses to run
 * from an account with Windows administrative privileges ("Execution of
 * PostgreSQL by a user with administrative permissions is not permitted").
 * Its only escape hatch is Unix-specific (useradd/uid-gid), so it cannot help
 * on Windows. pg_ctl is the supported answer: it relaunches the server under
 * a restricted token, dropping those privileges. We therefore keep the
 * library for initdb and client construction, and drive start/stop ourselves.
 *
 * A side benefit: a pg_ctl-started cluster outlives the process that started
 * it, so `start` and `stop` work as separate commands.
 *
 * Commands:
 *   npm run db:test:init    provision the cluster + database, apply migrations
 *   npm run db:test:start   start it in the background
 *   npm run db:test:stop    stop it
 *   npm run db:test:status  report whether it is initialised / running
 *
 * `npm test` starts and stops this automatically (server/test/global-setup.ts),
 * so day to day none of these commands are needed - they exist for poking at
 * the practice data by hand.
 */
import EmbeddedPostgres from 'embedded-postgres';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * One cluster, two databases - deliberately kept separate:
 *
 *   kigalimarket_test  `npm test` DELETES every row in it on each run.
 *   kigalimarket_dev   local development data, seeded and long-lived.
 *
 * Sharing a single database between the two would mean every test run wiped
 * whatever you had set up by hand in the running app.
 */
export const CLUSTER = {
  databaseDir: path.join(ROOT, '.pgdata'),
  port: 5433,
  user: 'postgres',
  password: 'password',
  testDatabase: 'kigalimarket_test',
  devDatabase: 'kigalimarket_dev',
} as const;

function urlFor(database: string): string {
  return (
    `postgresql://${CLUSTER.user}:${CLUSTER.password}` +
    `@localhost:${CLUSTER.port}/${database}`
  );
}

/** Wiped by the test suite. Targeted by .env.test. */
export const TEST_DATABASE_URL = urlFor(CLUSTER.testDatabase);

/** Local development data. Targeted by .env.local. */
export const DEV_DATABASE_URL = urlFor(CLUSTER.devDatabase);

/**
 * The two databases and the env file that points at each. `init` provisions
 * every entry, so adding one here is all that is needed to add a database.
 */
const DATABASES = [
  { name: CLUSTER.testDatabase, envFile: '.env.test', required: true },
  { name: CLUSTER.devDatabase, envFile: '.env.local', required: false },
] as const;

/**
 * Postgres and initdb are chatty, so their output is suppressed by default.
 * Set PRACTICE_DB_DEBUG=1 to see it - needed when initdb or startup fails,
 * because the errors it reports arrive on stderr rather than as exceptions.
 */
const DEBUG = process.env.PRACTICE_DB_DEBUG === '1';

const LOG_FILE = path.join(CLUSTER.databaseDir, 'server.log');

/**
 * The Postgres binaries live in a per-platform package
 * (@embedded-postgres/windows-x64, .../linux-x64, ...). Rather than hardcode
 * this machine's, find whichever one npm installed.
 */
function binDir(): string {
  const base = path.join(ROOT, 'node_modules', '@embedded-postgres');
  const candidates = fs.existsSync(base) ? fs.readdirSync(base) : [];
  const match = candidates.find((pkg) =>
    fs.existsSync(path.join(base, pkg, 'native', 'bin')),
  );

  if (!match) {
    throw new Error(
      'Could not find the vendored Postgres binaries. Run `npm install` first.',
    );
  }

  return path.join(base, match, 'native', 'bin');
}

function binary(name: string): string {
  return path.join(binDir(), process.platform === 'win32' ? `${name}.exe` : name);
}

/**
 * Run pg_ctl and wait for it to exit.
 *
 * `captureOutput` MUST be false for `start`. pg_ctl leaves behind a
 * long-lived postgres server that inherits whatever stdio handles pg_ctl was
 * given; with pipes, spawnSync keeps waiting for a pipe the daemon holds open
 * for its entire life, so the call never returns even though pg_ctl itself
 * exited and the server came up fine. Discarding stdio avoids the deadlock -
 * server output goes to LOG_FILE via `-l` anyway, which is the better place
 * to look.
 */
function pgCtl(
  args: string[],
  { captureOutput = true }: { captureOutput?: boolean } = {},
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(
    binary('pg_ctl'),
    args,
    captureOutput ? { encoding: 'utf8' } : { stdio: 'ignore' },
  );

  // The two option shapes above give spawnSync different return types, so
  // these widen to string | Buffer. With stdio:'ignore' they are null.
  const stdout = typeof result.stdout === 'string' ? result.stdout : '';
  const stderr = typeof result.stderr === 'string' ? result.stderr : '';

  if (DEBUG && captureOutput) {
    if (stdout.trim()) console.log(`[pg_ctl] ${stdout.trim()}`);
    if (stderr.trim()) console.error(`[pg_ctl] ${stderr.trim()}`);
  }

  return { status: result.status ?? 1, stdout, stderr };
}

/** Used only for initdb and for building pg clients - never to start the server. */
function createCluster(): EmbeddedPostgres {
  return new EmbeddedPostgres({
    databaseDir: CLUSTER.databaseDir,
    port: CLUSTER.port,
    user: CLUSTER.user,
    password: CLUSTER.password,
    authMethod: 'password',
    persistent: true,
    onLog: DEBUG ? (message) => console.log(`[postgres] ${message}`) : () => {},
    onError: DEBUG ? (error) => console.error(`[postgres] ${String(error)}`) : () => {},
  });
}

/** True once initdb has laid down a cluster in .pgdata. */
export function isInitialised(): boolean {
  return fs.existsSync(path.join(CLUSTER.databaseDir, 'PG_VERSION'));
}

/** True if something is already accepting TCP connections on the port. */
export function isListening(port: number = CLUSTER.port): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    const settle = (result: boolean) => {
      socket.destroy();
      resolve(result);
    };
    socket.once('connect', () => settle(true));
    socket.once('error', () => settle(false));
    socket.setTimeout(1_000, () => settle(false));
  });
}

/**
 * Start the cluster via pg_ctl. `-w` makes pg_ctl wait until the server is
 * actually accepting connections, so no polling loop is needed here.
 * No-ops if it is already running.
 */
export async function startCluster(): Promise<{ startedByUs: boolean }> {
  if (await isListening()) return { startedByUs: false };

  if (!isInitialised()) {
    throw new Error(
      'The practice database has not been provisioned yet.\nRun:  npm run db:test:init',
    );
  }

  const { status } = pgCtl(
    ['-D', CLUSTER.databaseDir, '-o', `-p ${CLUSTER.port}`, '-l', LOG_FILE, '-w', 'start'],
    { captureOutput: false },
  );

  if (status !== 0) {
    throw new Error(
      `pg_ctl could not start the practice database (exit ${status}).\n` +
        `See ${LOG_FILE} for details.`,
    );
  }

  return { startedByUs: true };
}

/** Stop the cluster. `-m fast` rolls back open transactions rather than waiting. */
export function stopCluster(): void {
  const { status, stderr } = pgCtl(['-D', CLUSTER.databaseDir, '-m', 'fast', '-w', 'stop']);

  if (status !== 0) {
    throw new Error(`pg_ctl could not stop the practice database (exit ${status}).\n${stderr.trim()}`);
  }
}

/** Create one of the practice databases if it is not already there. */
async function ensureDatabase(name: string): Promise<void> {
  const client = createCluster().getPgClient('postgres');

  try {
    await client.connect();
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);

    if (existing.rowCount) {
      console.log(`[practice-db] database "${name}" already exists`);
      return;
    }

    // A database name cannot be parameterised. Every value reaching this comes
    // from the DATABASES constant above, never from user input.
    await client.query(`CREATE DATABASE "${name}"`);
    console.log(`[practice-db] created database "${name}"`);
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * Apply the committed Prisma migrations to one practice database.
 *
 * The target comes from the given env file via dotenv-cli rather than being
 * passed from this file, so each database has exactly one source of truth for
 * its URL - and the manual command documented in .env.test.example is the
 * same one that runs here.
 */
function applyMigrations(envFile: string): void {
  console.log(`[practice-db] applying migrations via ${envFile} ...`);

  // Passed as one shell string rather than a command + args array: the array
  // form together with `shell: true` triggers Node's DEP0190 warning. envFile
  // comes from the DATABASES constant, never from user input.
  const result = spawnSync(`npx dotenv -e ${envFile} -- prisma migrate deploy`, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    throw new Error(`prisma migrate deploy failed for ${envFile} (exit code ${result.status}).`);
  }
}

async function commandInit(): Promise<void> {
  if (!fs.existsSync(path.join(ROOT, '.env.test'))) {
    throw new Error('.env.test is missing - copy .env.test.example and adjust it first.');
  }

  if (isInitialised()) {
    console.log(`[practice-db] cluster already initialised at ${CLUSTER.databaseDir}`);
  } else {
    console.log(`[practice-db] initialising cluster at ${CLUSTER.databaseDir} ...`);
    await createCluster().initialise();
  }

  const { startedByUs } = await startCluster();

  try {
    for (const { name, envFile, required } of DATABASES) {
      if (!fs.existsSync(path.join(ROOT, envFile))) {
        if (required) throw new Error(`${envFile} is missing.`);
        console.log(`[practice-db] skipping "${name}" - no ${envFile}`);
        continue;
      }

      await ensureDatabase(name);
      // Migrations have to run while the cluster is up, so this happens here
      // rather than as a second npm-script step.
      applyMigrations(envFile);
    }
  } finally {
    if (startedByUs) stopCluster();
  }

  console.log('[practice-db] ready.');
  console.log(`  tests : ${TEST_DATABASE_URL}`);
  console.log(`  dev   : ${DEV_DATABASE_URL}`);
}

async function commandStart(): Promise<void> {
  const { startedByUs } = await startCluster();

  if (!startedByUs) {
    console.log(`[practice-db] already running on port ${CLUSTER.port}`);
    return;
  }

  console.log(`[practice-db] running on port ${CLUSTER.port}`);
  console.log(`  tests : ${TEST_DATABASE_URL}`);
  console.log(`  dev   : ${DEV_DATABASE_URL}`);
  console.log('[practice-db] stop it with: npm run db:test:stop');
}

async function commandStop(): Promise<void> {
  if (!(await isListening())) {
    console.log('[practice-db] not running.');
    return;
  }

  stopCluster();
  console.log('[practice-db] stopped.');
}

async function commandStatus(): Promise<void> {
  const running = await isListening();

  console.log(`[practice-db] data dir    : ${CLUSTER.databaseDir}`);
  console.log(`[practice-db] initialised : ${isInitialised()}`);
  console.log(`[practice-db] running     : ${running} (port ${CLUSTER.port})`);
  console.log(`[practice-db] tests url   : ${TEST_DATABASE_URL}`);
  console.log(`[practice-db] dev url     : ${DEV_DATABASE_URL}`);

  if (!running) return;

  // Row counts make it obvious at a glance whether the dev database has been
  // seeded, which is the usual reason for checking status.
  const client = createCluster().getPgClient(CLUSTER.devDatabase);
  try {
    await client.connect();
    const counts = await client.query(
      `SELECT (SELECT count(*) FROM "Administrator") AS admins,
              (SELECT count(*) FROM "Product")       AS products,
              (SELECT count(*) FROM "Category")      AS categories`,
    );
    const { admins, products, categories } = counts.rows[0];
    console.log(
      `[practice-db] dev data    : ${admins} admins, ${products} products, ${categories} categories`,
    );
  } catch {
    console.log('[practice-db] dev data    : not migrated yet (run npm run db:test:init)');
  } finally {
    await client.end().catch(() => {});
  }
}

const COMMANDS: Record<string, () => Promise<void>> = {
  init: commandInit,
  start: commandStart,
  stop: commandStop,
  status: commandStatus,
};

// Only run the CLI when executed directly, not when imported by global-setup.
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const command = process.argv[2] ?? '';
  const handler = COMMANDS[command];

  if (!handler) {
    console.error(`Usage: tsx scripts/test-db.ts <${Object.keys(COMMANDS).join('|')}>`);
    process.exit(1);
  }

  handler().catch((error) => {
    console.error(`[practice-db] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
