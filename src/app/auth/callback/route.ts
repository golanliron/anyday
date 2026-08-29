import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * Supabase Auth callback. Google OAuth and magic-link both land here with a
 * `code` we exchange for a session (stored in cookies), then continue to `next`.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/app";
  const safeNext = next.startsWith("/") ? next : "/app";

  if (code) {
    const supabase = await createServerSupabase();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${url.origin}${safeNext}`);
      }
    }
  }

  return NextResponse.redirect(`${url.origin}/login?auth_error=1`);
}
