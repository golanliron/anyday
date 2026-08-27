import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/session";
import { isSupabaseServerConfigured } from "@/lib/supabase-server";

/**
 * Tells the client the current Monday connection state for the logged-in
 * user's org — WITHOUT ever exposing the token itself.
 */
export async function GET() {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ configured: false, authed: false, connected: false });
  }
  const ctx = await getOrgContext();
  if (!ctx) {
    return NextResponse.json({ configured: true, authed: false, connected: false });
  }
  return NextResponse.json({
    configured: true,
    authed: true,
    connected: ctx.mondayConnected,
    orgName: ctx.orgName,
    accountName: ctx.mondayAccountName,
  });
}
