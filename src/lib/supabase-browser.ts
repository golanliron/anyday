import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components ("use client").
 * Uses the public anon key + the logged-in user's session cookie, so every
 * query it makes is subject to RLS as that user.
 *
 * Returns null when env is not configured, so the app can still boot and show
 * a "configure me" state instead of crashing.
 */
export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createBrowserClient(url, anon);
}

export const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
