import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { runProductExpirySweep } from './utils/productExpiry.js';
import { withDbRetry } from './utils/dbRetry.js';

// Last-resort safety net for anything outside Express's request/response cycle
// (a stray unawaited promise, a background Prisma engine event, etc.) - the
// route-level equivalent is express-async-errors in app.ts, but this catches
// what that can't. Every request handler in this app is stateless (no in-memory
// session/transaction state that could be left corrupted), so logging and
// staying up is safer for uptime than crashing the whole server over one
// transient error - e.g. a serverless Postgres host cold-starting from idle.
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled promise rejection - server staying up]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Uncaught exception - server staying up]', err);
});

app.listen(env.PORT, () => {
  console.log(`Administration System Server running on port ${env.PORT} in ${env.NODE_ENV} mode.`);
});

// Every fresh process start reliably hits 2-3 consecutive "Can't reach
// database server" errors against the pooler in the first ~10-20 seconds,
// then is stable for the rest of the process's life (confirmed across every
// dev restart this session - never happens randomly mid-run). Doesn't block
// app.listen() above (the server should still accept connections and answer
// /api/health immediately), but actively establishing and retrying a
// connection right away means the pooler is already warm by the time the
// first real request or the scheduled sweep below needs it, instead of that
// first real request being the one to eat the failure.
withDbRetry(() => prisma.$queryRaw`SELECT 1`, { retries: 5, delayMs: 1000, label: 'DB warm-up' })
  .then(() => console.log('[DB warm-up] Connection established.'))
  .catch((err) => console.error('[DB warm-up] Gave up after retries - first real request will retry again.', err));

// Product listing lifecycle sweep (6-month expiry, last-week reminder - see
// utils/productExpiry.ts). Runs shortly after startup so a server that was
// down for a while catches up immediately, then on a steady interval. A
// 6-hour cadence is comfortably fine-grained against a 7-day reminder window
// without needing external cron infrastructure.
const EXPIRY_SWEEP_INTERVAL_MS = 1000 * 60 * 60 * 6;
function runSweepSafely() {
  // Same connection warm-up flakiness can hit the sweep's own first query -
  // without this, hitting it here meant waiting a full 6 hours for the next
  // scheduled run instead of just retrying a few seconds later.
  withDbRetry(runProductExpirySweep, { retries: 3, delayMs: 2000, label: 'Product expiry sweep' })
    .then(({ remindersSent, deleted }) => {
      if (remindersSent || deleted) {
        console.log(`[Product expiry sweep] Reminders sent: ${remindersSent}, listings removed: ${deleted}.`);
      }
    })
    .catch((err) => console.error('[Product expiry sweep failed after retries]', err));
}
setTimeout(runSweepSafely, 10_000);
setInterval(runSweepSafely, EXPIRY_SWEEP_INTERVAL_MS);
