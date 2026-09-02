import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required. Use PostgreSQL, for example the local database from npm run db:test:init.'),
  DIRECT_URL: z.string().optional(),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('3001'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters.'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Optional, not defaulted: uploads.routes.ts falls back to local disk
  // storage when these aren't set (e.g. a fresh local checkout), and only
  // requires them once Supabase Storage is actually being used.
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  // Where "Contact Us" form submissions and their email notifications go.
  // Also the address shown across the marketplace/support pages (the Gasabo
  // Real Estate portal keeps its own info@gasaborealestate.com).
  CONTACT_EMAIL: z.string().email().default('kigalimarket20@gmail.com'),
  // Optional SMTP transport for outbound mail (currently just the contact-form
  // notification). All absent -> utils/email.ts logs the message instead of
  // sending, the same way uploads.routes.ts falls back to local disk when
  // Supabase Storage isn't configured. Set all of HOST/USER/PASS to send.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform((v) => parseInt(v, 10)).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Public origin this site is served from, used to build the absolute URLs
  // that crawlers and social scrapers require: <link rel="canonical">,
  // og:url, og:image and every <loc> in the sitemap. Relative URLs are
  // ignored by most scrapers, so this cannot be derived from the request.
  // No trailing slash.
  PUBLIC_SITE_URL: z
    .string()
    .url()
    .default('https://www.kigalimarket.com')
    .transform((url) => url.replace(/\/+$/, '')),
});

const parsed = envSchema.parse(process.env);

if (parsed.NODE_ENV === 'production') {
  if (parsed.JWT_SECRET === 'kigali_market_admin_super_secret_jwt_key_2026') {
    throw new Error('Refusing to boot production with the old development JWT_SECRET.');
  }
  if (!parsed.DIRECT_URL) {
    throw new Error('DIRECT_URL is required in production so Prisma migrations use a direct PostgreSQL connection.');
  }
}

export const env = parsed;
