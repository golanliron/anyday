import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mondayQuery, requireMonday } from "@/lib/monday-server";
import { fetchBoards, parseBoardIds } from "@/lib/board-fetch";

/**
 * Chat-driven WRITE actions on Monday, always in two steps:
 *   1) POST {mode:"preview", ...}  → returns exactly what will change (no write)
 *   2) POST {mode:"apply", ...}    → performs the mutation
 * Generic: works by finding the right item + status-type column by TYPE, not
 * by hard-coded names, so it fits any nonprofit's board.
 *
 * The status text comes from a free-text chat message, so the write travels as
 * a GraphQL variable rather than being pasted into the mutation string.
 */
export async function POST(req: NextRequest) {
  const guard = await requireMonday();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => ({}));
  const { mode, personName, newStatus, boardId, itemId, columnId, columnTitle } = body;

  const selected = parseBoardIds((await cookies()).get("anyday_selected_boards")?.value);
  if (!selected.length) return NextResponse.json({ error: "בחרו בורד" }, { status: 400 });

  // ── PREVIEW: find the person + the status column, return the plan ──
  if (mode === "preview") {
    if (!personName || !newStatus) return NextResponse.json({ error: "חסר שם או סטטוס" }, { status: 400 });
    try {
      const boards = await fetchBoards(selected, guard.token);
      for (const b of boards) {
        const statusCol = b.columns.find((c) => ["status", "color"].includes(c.type));
        if (!statusCol) continue;
        const item = b.items.find((it) => it.name.includes(personName) || personName.includes(it.name));
        if (!item) continue;
        const current = item.values.find((cv) => cv.colId === statusCol.id)?.text || "—";
        return NextResponse.json({
          found: true,
          preview: { personName: item.name, boardId: b.id, boardName: b.name, itemId: item.id, columnId: statusCol.id, columnTitle: statusCol.title, from: current, to: newStatus },
        });
      }
      return NextResponse.json({ found: false, message: `לא מצאתי את "${personName}" בבורדים שבחרתם, או שאין עמודת סטטוס.` });
    } catch (e: unknown) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "שגיאה" }, { status: 502 });
    }
  }

  // ── APPLY: perform the change ──
  if (mode === "apply") {
    if (!boardId || !itemId || !columnId || !newStatus) return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
    try {
      await mondayQuery(
        `mutation ($board:ID!, $item:ID!, $column:String!, $value:JSON!) {
           change_column_value(board_id:$board, item_id:$item, column_id:$column, value:$value) { id }
         }`,
        guard.token,
        {
          board: String(boardId),
          item: String(itemId),
          column: String(columnId),
          value: JSON.stringify({ label: String(newStatus) }),
        }
      );
      return NextResponse.json({ ok: true, message: `עודכן: ${columnTitle || "סטטוס"} → ${newStatus}` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "שגיאה";
      return NextResponse.json({ error: `העדכון נכשל: ${msg}` }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "mode לא תקין" }, { status: 400 });
}
