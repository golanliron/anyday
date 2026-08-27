import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mondayQuery, requireMonday } from "@/lib/monday-server";

const SEL_COOKIE = "anyday_selected_boards";

/**
 * GET — lightweight list of the account's boards (no items) so the user can
 * pick which ones AnyDay focuses on. Also returns the currently-selected ids.
 */
export async function GET() {
  const guard = await requireMonday();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const data = await mondayQuery(
      `query { boards(limit:100, order_by:used_at, state:active) {
         id name items_count description
       } }`,
      guard.token
    );
    const boards = (data?.boards || []).map((b: { id: string; name: string; items_count: number; description: string | null }) => ({
      id: b.id, name: b.name, items: b.items_count, description: b.description || "",
    }));
    const selected = (await cookies()).get(SEL_COOKIE)?.value?.split(",").filter(Boolean) || [];
    return NextResponse.json({ boards, selected });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "שגיאה" }, { status: 502 });
  }
}

/**
 * POST — save the user's chosen board ids (max 2) to a cookie.
 */
export async function POST(req: NextRequest) {
  const guard = await requireMonday();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { boardIds } = await req.json().catch(() => ({ boardIds: [] }));
  if (!Array.isArray(boardIds) || boardIds.length === 0) {
    return NextResponse.json({ error: "בחרו לפחות בורד אחד" }, { status: 400 });
  }
  const ids = boardIds.slice(0, 2).map(String);
  (await cookies()).set(SEL_COOKIE, ids.join(","), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  return NextResponse.json({ ok: true, selected: ids });
}
