import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.MONDAY_CLIENT_ID;
  if (!clientId) {
    return Response.json({ error: "Monday OAuth not configured" }, { status: 500 });
  }

  const redirectUri = `${request.nextUrl.origin}/api/monday-oauth/callback`;

  const mondayAuthUrl = new URL("https://auth.monday.com/oauth2/authorize");
  mondayAuthUrl.searchParams.set("client_id", clientId);
  mondayAuthUrl.searchParams.set("redirect_uri", redirectUri);

  return Response.redirect(mondayAuthUrl.toString());
}
