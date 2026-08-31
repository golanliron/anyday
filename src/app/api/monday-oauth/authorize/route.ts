import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

// Shared by name with the callback route (a route file may not export it).
const OAUTH_STATE_COOKIE = "anyday_oauth_state";

/**
 * Starts the Monday OAuth flow — with a CSRF binding (RFC 6749 §10.12).
 *
 * `state` used to carry the return path and nothing else, so a callback URL
 * was valid in ANY browser: an attacker could authorize their own Monday
 * account, capture the redirect with their code, and get a victim to open it —
 * the victim's org would then be silently connected to the attacker's Monday
 * account, and every report the victim ran would read the attacker's data.
 *
 * Now `state` is a random nonce that is ALSO stored in an httpOnly cookie in
 * the browser that started the flow. The callback accepts the code only when
 * the two match, which no cross-site link can arrange. The return path rides
 * in the cookie, not in `state`, so it cannot be tampered with either.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.MONDAY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Monday OAuth not configured" }, { status: 500 });
  }

  const rawReturnTo = request.nextUrl.searchParams.get("return_to") || "/";
  // Same-site paths only — anything else is an open-redirect attempt.
  const returnTo = rawReturnTo.startsWith("/") ? rawReturnTo : "/";
  const redirectUri = `${request.nextUrl.origin}/api/monday-oauth/callback`;

  const nonce = randomBytes(16).toString("hex");

  const mondayAuthUrl = new URL("https://auth.monday.com/oauth2/authorize");
  mondayAuthUrl.searchParams.set("client_id", clientId);
  mondayAuthUrl.searchParams.set("redirect_uri", redirectUri);
  // Request exactly the scopes AnyDay needs — the user sees this list on the
  // Monday consent screen and can revoke it any time from their account.
  mondayAuthUrl.searchParams.set("scope", "me:read boards:read boards:write");
  mondayAuthUrl.searchParams.set("state", nonce);

  const res = NextResponse.redirect(mondayAuthUrl.toString());
  res.cookies.set(OAUTH_STATE_COOKIE, `${nonce}|${returnTo}`, {
    httpOnly: true,
    // Lax: the cookie must survive the top-level redirect back from
    // auth.monday.com, and Lax sends cookies on exactly that navigation.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/monday-oauth",
    maxAge: 600, // the consent screen should not take longer than 10 minutes
  });
  return res;
}
