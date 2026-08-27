import { NextResponse } from "next/server";
import { getOrgContext } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase-server";

/**
 * Clears the stored Monday token for the current user's org.
 * "Delete in one click" — the trust promise on the landing page.
 */
export async function POST() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const service = createServiceClient();
  if (!service) return NextResponse.json({ error: "storage_unavailable" }, { status: 500 });

  const { error } = await service
    .from("organizations")
    .update({
      monday_token_encrypted: null,
      monday_account_id: null,
      monday_account_name: null,
      monday_connected_at: null,
    })
    .eq("id", ctx.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
