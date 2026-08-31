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

  // ניתוק Monday משבית את הארגון כולו — דיגסט, דוחות, הכל. החלטת אדמין.
  // הקיר האמיתי הוא RLS (v5: עדכון organizations = אדמין); כאן רק סירוב ברור.
  if (ctx.role !== "admin")
    return NextResponse.json({ error: "רק אדמין יכול לנתק את חיבור ה-Monday" }, { status: 403 });

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
