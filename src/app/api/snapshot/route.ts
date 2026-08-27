import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mondayQuery, requireMonday } from "@/lib/monday-server";

/**
 * Snapshot endpoint — reads the account's boards from the REAL Monday account
 * and returns aggregate numbers for the "תמונת מצב" dashboard. It is generic:
 * it does not assume any specific board/column names, so it works for any
 * nonprofit's Monday structure.
 */
export async function GET() {
  const guard = await requireMonday();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    // Who am I + my boards (names, item counts, columns).
    const meData = await mondayQuery(`query { me { name account { name } } }`, guard.token);
    const boardsData = await mondayQuery(
      `query { boards(limit:50, order_by:used_at, state:active) {
         id name items_count description
         columns { id title type }
       } }`,
      guard.token
    );

    const me = meData?.me;
    let boards: Array<{
      id: string; name: string; items_count: number; description: string | null;
      columns: Array<{ id: string; title: string; type: string }>;
    }> = boardsData?.boards || [];

    // If the user picked specific boards, focus only on those.
    const selected = (await cookies()).get("anyday_selected_boards")?.value?.split(",").filter(Boolean);
    if (selected && selected.length) {
      boards = boards.filter((b) => selected.includes(String(b.id)));
    }

    const totalItems = boards.reduce((s, b) => s + (b.items_count || 0), 0);

    // Trend: pull recent items across the busiest few boards and bucket by day
    // of their created/updated time so the dashboard has a real activity line.
    const topBoards = [...boards].sort((a, b) => b.items_count - a.items_count).slice(0, 3);
    const trend: Record<string, number> = {};
    for (const b of topBoards) {
      try {
        const d = await mondayQuery(
          `query { boards(ids:[${b.id}]) { items_page(limit:200) { items { updated_at } } } }`,
          guard.token
        );
        const items = d?.boards?.[0]?.items_page?.items || [];
        for (const it of items) {
          const day = (it.updated_at || "").slice(0, 10);
          if (day) trend[day] = (trend[day] || 0) + 1;
        }
      } catch { /* skip a board that fails */ }
    }
    const trendSeries = Object.entries(trend)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      account: me?.account?.name ?? null,
      userName: me?.name ?? null,
      boardsCount: boards.length,
      totalItems,
      boards: boards.map((b) => ({
        id: b.id, name: b.name, items: b.items_count,
        columns: b.columns?.length || 0,
      })),
      trend: trendSeries,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "שגיאה בקריאת Monday";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
