import { NextRequest } from "next/server";
import { getOrgContext } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase-server";
import { encrypt } from "@/lib/encryption";

const MONDAY_API = "https://api.monday.com/v2";

/**
 * Monday OAuth callback.
 * Exchanges the code for an access token, encrypts it, and stores it on the
 * logged-in user's organization. The token NEVER travels back to the browser.
 * On return we redirect to the originating page with a simple success flag.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") || "/";
  const returnTo = state.startsWith("/") ? state : "/"; // prevent open redirect

  const fail = (reason: string) =>
    Response.redirect(`${origin}${returnTo}?monday_error=${reason}`);

  if (!code) return fail("missing_code");

  // The user must be logged into AnyDay so we know which org to attach to.
  const ctx = await getOrgContext();
  if (!ctx) {
    return Response.redirect(`${origin}/login?callbackUrl=${encodeURIComponent(returnTo)}`);
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

  return Response.redirect(`${origin}${returnTo}?monday=connected`);
}
