import { PrismaClient } from '@prisma/client';
import { isDbUnreachableError } from '../utils/dbRetry.js';

const basePrisma = new PrismaClient();

// Every fresh process start reliably hits 2-3 consecutive "Can't reach
// database server" errors against the pooler before settling - confirmed
// across every dev restart this session, never happens randomly mid-run.
// index.ts's startup warm-up and the scheduled sweep already retry
// explicitly, but that still left every *user-facing* route (login, loading
// products, everything) to eat that failure directly as a 503 if it landed
// during that same window. Extending the client itself means every query
// this app makes, anywhere, automatically retries a couple of times on
// exactly this failure class before giving up - one fix instead of
// retrofitting every route handler individually.
export const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ args, query }) {
      const retries = 2;
      const delayMs = 800;
      let lastErr: unknown;
      for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
          return await query(args);
        } catch (err) {
          lastErr = err;
          if (!isDbUnreachableError(err) || attempt > retries) throw err;
          await new Promise((r) => setTimeout(r, delayMs * attempt));
        }
      }
      throw lastErr;
    },
  },
});
