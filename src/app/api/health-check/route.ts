import { NextResponse } from "next/server";
import { getBoards, getItems } from "@/lib/monday";
import { runHealthCheck } from "@/lib/health-engine";
import { requireMonday } from "@/lib/monday-server";
import type { MondayItem } from "@/types";

export async function POST() {
  try {
    // Resolve token from the logged-in user's org — never from the client.
    const guard = await requireMonday();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }
    const token = guard.token;

    // Fetch boards (up to 25)
    let boards;
    try {
      boards = await getBoards(token);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "שגיאה לא ידועה";
      // Don't leak the token in error messages
      if (msg.includes("401") || msg.includes("Not Authenticated")) {
        return NextResponse.json(
          { error: "הטוקן שגוי או שפג תוקפו. בדקו את ה-API Token ב-Monday." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: `שגיאה בחיבור ל-Monday: ${msg}` },
        { status: 502 }
      );
    }

    if (!boards || boards.length === 0) {
      return NextResponse.json(
        { error: "לא נמצאו בורדים בחשבון Monday שלכם." },
        { status: 404 }
      );
    }

    // Fetch items for each board (parallel, limited to first 10 boards)
    const boardsToScan = boards.slice(0, 10);
    const itemsByBoard = new Map<string, MondayItem[]>();

    const results = await Promise.allSettled(
      boardsToScan.map(async (board) => {
        const items = await getItems(token, board.id);
        return { boardId: board.id, items };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        itemsByBoard.set(result.value.boardId, result.value.items);
      }
      // Skip boards that failed to load (don't crash the whole scan)
    }

    // Run health check
    const healthResult = runHealthCheck(boardsToScan, itemsByBoard);

    return NextResponse.json({
      ...healthResult,
      boardNames: boardsToScan.map(b => b.name),
      totalBoardsInAccount: boards.length,
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
