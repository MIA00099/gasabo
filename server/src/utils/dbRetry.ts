/**
 * Retry helper specifically for the connection-warm-up failure pattern seen
 * repeatedly in dev: every fresh process start hits 2-3 consecutive
 * "Can't reach database server" errors against Supabase's pooler in the
 * first ~10-20 seconds, then is stable for the rest of the process's life.
 * Not Supabase's 7-day free-tier pause (confirmed - that's a ~30s wake-up
 * after a full week idle, doesn't match failing within seconds of a fresh
 * connection). Most likely the pooler warming up a backend connection for a
 * brand-new client. Whatever the exact mechanism, retrying briefly instead
 * of failing immediately turns a visible error into an invisible delay.
 */
import { Prisma } from '@prisma/client';

const DB_UNREACHABLE_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);

export function isDbUnreachableError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err && typeof err === 'object' && 'code' in err) {
    return DB_UNREACHABLE_CODES.has(String((err as { code: unknown }).code));
  }
  return false;
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; delayMs?: number; label?: string } = {}
): Promise<T> {
  const retries = opts.retries ?? 3;
  const delayMs = opts.delayMs ?? 1500;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isDbUnreachableError(err) || attempt > retries) throw err;
      if (opts.label) {
        console.log(`[${opts.label}] Database unreachable (attempt ${attempt}/${retries}), retrying in ${delayMs * attempt}ms...`);
      }
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
  throw lastErr;
}
