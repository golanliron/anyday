import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseServerConfigured() {
  return Boolean(URL && ANON);
}

/**
 * Request-scoped Supabase client for Server Components, Route Handlers and
 * Server Actions. Reads/writes the auth cookie so queries run AS the logged-in
 * user and are subject to RLS. Returns null if env is missing.
 */
export async function createServerSupabase() {
  if (!URL || !ANON) return null;
  const cookieStore = await cookies();

  return createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll can throw in a pure Server Component render (no response to
          // attach cookies to). Middleware refreshes the session, so this is safe.
        }
      },
    },
  });
}

/**
 * Service-role client — bypasses RLS. Use ONLY for trusted server-side
 * operations that must cross tenant boundaries in a controlled way, e.g.
 * bootstrapping a brand-new org membership or reading the encrypted Monday
 * token for the current user's org after we have already verified ownership.
 * Never expose this to the client and never key its queries off client input.
 */
export function createServiceClient() {
  if (!URL || !SERVICE) return null;
  return createClient(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
