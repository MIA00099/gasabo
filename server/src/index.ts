import { app } from './app.js';
import { env } from './config/env.js';
import { runProductExpirySweep } from './utils/productExpiry.js';

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

// Product listing lifecycle sweep (6-month expiry, last-week reminder - see
// utils/productExpiry.ts). Runs shortly after startup so a server that was
// down for a while catches up immediately, then on a steady interval. A
// 6-hour cadence is comfortably fine-grained against a 7-day reminder window
// without needing external cron infrastructure.
const EXPIRY_SWEEP_INTERVAL_MS = 1000 * 60 * 60 * 6;
function runSweepSafely() {
  runProductExpirySweep()
    .then(({ remindersSent, deleted }) => {
      if (remindersSent || deleted) {
        console.log(`[Product expiry sweep] Reminders sent: ${remindersSent}, listings removed: ${deleted}.`);
      }
    })
    .catch((err) => console.error('[Product expiry sweep failed]', err));
}
setTimeout(runSweepSafely, 10_000);
setInterval(runSweepSafely, EXPIRY_SWEEP_INTERVAL_MS);
