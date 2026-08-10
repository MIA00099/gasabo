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
});

export const env = envSchema.parse(process.env);
