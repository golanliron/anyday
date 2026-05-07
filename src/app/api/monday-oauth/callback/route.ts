import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") || "/";

  // Validate return_to is a relative path (prevent open redirect)
  const returnTo = state.startsWith("/") ? state : "/";

  if (!code) {
    return Response.redirect(`${request.nextUrl.origin}${returnTo}?monday_error=missing_code`);
  }

  const tokenRes = await fetch("https://auth.monday.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.MONDAY_CLIENT_ID,
      client_secret: process.env.MONDAY_CLIENT_SECRET,
      code,
      redirect_uri: `${request.nextUrl.origin}/api/monday-oauth/callback`,
    }),
  });

  if (!tokenRes.ok) {
    console.error("Monday token exchange failed:", await tokenRes.text());
    return Response.redirect(`${request.nextUrl.origin}${returnTo}?monday_error=token_failed`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return Response.redirect(`${request.nextUrl.origin}${returnTo}?monday_error=no_token`);
  }

  // Redirect back to the originating page with token
  const separator = returnTo.includes("?") ? "&" : "?";
  return Response.redirect(
    `${request.nextUrl.origin}${returnTo}${separator}monday_token=${encodeURIComponent(accessToken)}`
  );
}
