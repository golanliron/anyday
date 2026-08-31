import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { getOrgContext } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase-server";
import { encrypt } from "@/lib/encryption";

const MONDAY_API = "https://api.monday.com/v2";
const OAUTH_STATE_COOKIE = "anyday_oauth_state";

/** Constant-time compare that tolerates different lengths (hash first). */
function nonceMatches(presented: string, stored: string): boolean {
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(stored).digest();
  return timingSafeEqual(a, b);
}

/**
 * Monday OAuth callback.
 * Exchanges the code for an access token, encrypts it, and stores it on the
 * logged-in user's organization. The token NEVER travels back to the browser.
 * On return we redirect to the originating page with a simple success flag.
 *
 * The `state` parameter must equal the nonce the authorize route planted in
 * this browser's cookie (RFC 6749 §10.12) — see authorize/route.ts for the
 * attack this stops. The return path comes from that cookie too, never from
 * the URL. The cookie is single-use: every exit from here clears it.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") || "";

  const stored = request.cookies.get(OAUTH_STATE_COOKIE)?.value || "";
  const sep = stored.indexOf("|");
  const nonce = sep > 0 ? stored.slice(0, sep) : "";
  const cookieReturnTo = sep > 0 ? stored.slice(sep + 1) : "/";
  const returnTo = cookieReturnTo.startsWith("/") ? cookieReturnTo : "/"; // prevent open redirect

  const redirect = (to: string) => {
    const res = NextResponse.redirect(`${origin}${to}`);
    res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/api/monday-oauth", maxAge: 0 });
    return res;
  };
  const fail = (reason: string) => redirect(`${returnTo}?monday_error=${reason}`);

  // No nonce in this browser, or a state that does not match it → this
  // callback was not started here. Refuse before touching the code.
  if (!nonce || !state || !nonceMatches(state, nonce)) return fail("state_mismatch");

  if (!code) return fail("missing_code");

  // The user must be logged into AnyDay so we know which org to attach to.
  const ctx = await getOrgContext();
  if (!ctx) {
    return redirect(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);
  }

  // 1. Exchange the code for an access token.
  const tokenRes = await fetch("https://auth.monday.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.MONDAY_CLIENT_ID,
      client_secret: process.env.MONDAY_CLIENT_SECRET,
      code,
      redirect_uri: `${origin}/api/monday-oauth/callback`,
    }),
  });
  if (!tokenRes.ok) {
    console.error("Monday token exchange failed:", await tokenRes.text());
    return fail("token_failed");
  }
  const tokenData = await tokenRes.json();
  const accessToken: string | undefined = tokenData.access_token;
  if (!accessToken) return fail("no_token");

  // 2. Identify the Monday account this token belongs to (nice label + id).
  let accountName: string | null = null;
  let accountId: string | null = null;
  try {
    const meRes = await fetch(MONDAY_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: accessToken,
        "API-Version": "2024-01",
      },
      body: JSON.stringify({ query: `query { me { account { id name } } }` }),
    });
    const meJson = await meRes.json();
    accountName = meJson?.data?.me?.account?.name ?? null;
    accountId = meJson?.data?.me?.account?.id?.toString() ?? null;
  } catch {
    // Non-fatal — we still store the token.
  }

  // 3. Encrypt + store on the org (service client bypasses RLS; we already
  //    proved via getOrgContext that this user owns this org).
  const service = createServiceClient();
  if (!service) return fail("storage_unavailable");

  const { error } = await service
    .from("organizations")
    .update({
      monday_token_encrypted: encrypt(accessToken),
      monday_account_id: accountId,
      monday_account_name: accountName,
      monday_connected_at: new Date().toISOString(),
    })
    .eq("id", ctx.orgId);

  if (error) {
    console.error("Storing Monday token failed:", error.message);
    return fail("store_failed");
  }

  return redirect(`${returnTo}?monday=connected`);
}
