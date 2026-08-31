import { NextResponse } from "next/server";
import { runHealthCheck } from "@/lib/health-engine";
import { mondayQuery, requireMonday, isMondayAuthFailure } from "@/lib/monday-server";
import { fetchBoards, coverage } from "@/lib/board-fetch";
import type { MondayBoard, MondayItem } from "@/types";

/**
 * Scans the account's boards and returns the health engine's findings.
 *
 * Items are read through `fetchBoards()` — the ONE paginated reader — so a
 * 700-item board is actually read (up to the honesty cap), not silently
 * truncated at page one. This route used to hold its own second Monday reader
 * (`lib/monday.ts`, 100 items, no cursor) and present the result as a scan;
 * the `coverage` object in the answer now says exactly how much was read, and
 * the UI repeats it. A finding like "אין פריטים באיחור" computed over an
 * unlabeled sample is not a finding, it is a guess.
 */
export async function POST() {
  try {
    // Resolve token from the logged-in user's org — never from the client.
    const guard = await requireMonday();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }
    const token = guard.token;

    // The board list: names, declared item counts, columns (no items yet).
    let boards: MondayBoard[];
    try {
      const data = await mondayQuery(
        `query { boards(limit:25) { id name description items_count columns { id title type } } }`,
        token
      );
      boards = (data?.boards || []) as MondayBoard[];
    } catch (e: unknown) {
      if (isMondayAuthFailure(e)) {
        return NextResponse.json(
          { error: "הטוקן שגוי או שפג תוקפו. בדקו את חיבור ה-Monday." },
          { status: 401 }
        );
      }
      const msg = e instanceof Error ? e.message : "שגיאה לא ידועה";
      return NextResponse.json({ error: `שגיאה בחיבור ל-Monday: ${msg}` }, { status: 502 });
    }

    if (!boards || boards.length === 0) {
      return NextResponse.json(
        { error: "לא נמצאו בורדים בחשבון Monday שלכם." },
        { status: 404 }
      );
    }

    // First 10 boards, read WITH pagination up to the cap. A board that fails
    // to load simply has no entry in the map — the scan continues without it.
    const boardsToScan = boards.slice(0, 10);
    let fetched;
    try {
      fetched = await fetchBoards(boardsToScan.map((b) => String(b.id)), token);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "שגיאה בקריאת הבורדים";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const itemsByBoard = new Map<string, MondayItem[]>();
    for (const fb of fetched) {
      itemsByBoard.set(
        String(fb.id),
        fb.items.map((it) => ({
          id: it.id,
          name: it.name,
          column_values: it.values.map((v) => ({
            id: v.colId,
            text: v.text,
            column: { title: v.title, type: v.type },
          })),
        }))
      );
    }

    const healthResult = runHealthCheck(boardsToScan, itemsByBoard);
    const cov = coverage(fetched);

    return NextResponse.json({
      ...healthResult,
      boardNames: boardsToScan.map((b) => b.name),
      totalBoardsInAccount: boards.length,
      // How much of the data the findings are actually based on — the UI
      // shows the note, so a partial read is never presented as a full scan.
      coverage: cov,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Health check error:", msg);
    return NextResponse.json(
      { error: `שגיאה פנימית בשרת: ${msg}` },
      { status: 500 }
    );
  }
}
