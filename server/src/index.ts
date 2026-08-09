import { app } from './app.js';
import { env } from './config/env.js';

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
