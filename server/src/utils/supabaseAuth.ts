import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { generateTemporaryPassword } from './passwords.js';

let supabaseAuthClient: SupabaseClient | null | undefined;

function getSupabaseAuthClient(): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  if (supabaseAuthClient !== undefined) return supabaseAuthClient;

  supabaseAuthClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  return supabaseAuthClient;
}

function configuredClient(): SupabaseClient {
  const client = getSupabaseAuthClient();
  if (!client) {
    throw new Error('Supabase Auth is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return client;
}

function isExistingAuthUserError(error: { message?: string; status?: number } | null | undefined) {
  const message = String(error?.message || '');
  return error?.status === 422 || /already.*registered|already.*exists|duplicate/i.test(message);
}

async function ensureSupabaseAuthUser(email: string, name: string) {
  const supabase = configuredClient();
  const { error } = await supabase.auth.admin.createUser({
    email,
    password: generateTemporaryPassword(32),
    email_confirm: true,
    user_metadata: {
      name,
      source: 'kigali_market_seller',
    },
  });

  if (error && !isExistingAuthUserError(error)) {
    throw error;
  }
}

export async function sendSellerPasswordResetLink(input: { email: string; name: string }) {
  const supabase = configuredClient();
  await ensureSupabaseAuthUser(input.email, input.name);

  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: `${env.PUBLIC_SITE_URL}/reset-password`,
  });
  if (error) throw error;
}

export async function getSupabaseUserForRecoveryToken(accessToken: string) {
  const supabase = configuredClient();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user?.id || !data.user.email) {
    throw new Error('This reset link is invalid or expired. Request a new password reset email.');
  }
  return { id: data.user.id, email: data.user.email };
}

export async function updateSupabaseUserPassword(userId: string, newPassword: string) {
  const supabase = configuredClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) throw error;
}

export async function signInWithSupabasePassword(email: string, password: string) {
  const supabase = getSupabaseAuthClient();
  if (!supabase) return false;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data?.user?.email) return false;
  return data.user.email.toLowerCase() === email.toLowerCase();
}
