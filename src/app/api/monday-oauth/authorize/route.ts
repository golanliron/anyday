import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.MONDAY_CLIENT_ID;
  if (!clientId) {
    return Response.json({ error: "Monday OAuth not configured" }, { status: 500 });
  }

  const returnTo = request.nextUrl.searchParams.get("return_to") || "/";
  const redirectUri = `${request.nextUrl.origin}/api/monday-oauth/callback`;

  const mondayAuthUrl = new URL("https://auth.monday.com/oauth2/authorize");
  mondayAuthUrl.searchParams.set("client_id", clientId);
  mondayAuthUrl.searchParams.set("redirect_uri", redirectUri);
  // Request exactly the scopes AnyDay needs — the user sees this list on the
  // Monday consent screen and can revoke it any time from their account.
  mondayAuthUrl.searchParams.set("scope", "me:read boards:read boards:write");
  // Pass return_to through state param so callback knows where to redirect
  mondayAuthUrl.searchParams.set("state", returnTo);

  return Response.redirect(mondayAuthUrl.toString());
}
