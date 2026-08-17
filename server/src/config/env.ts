import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().default('file:./dev.db'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('3001'),
  JWT_SECRET: z.string().min(16).default('kigali_market_admin_super_secret_jwt_key_2026'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Optional, not defaulted: uploads.routes.ts falls back to local disk
  // storage when these aren't set (e.g. a fresh local checkout), and only
  // requires them once Supabase Storage is actually being used.
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
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

export const env = envSchema.parse(process.env);
