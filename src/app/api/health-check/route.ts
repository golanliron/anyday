import { NextRequest, NextResponse } from "next/server";
import { getBoards, getItems } from "@/lib/monday";
import { runHealthCheck } from "@/lib/health-engine";
import type { MondayItem } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token;

    if (!token || typeof token !== "string" || token.trim().length < 10) {
      return NextResponse.json(
        { error: "נא להזין Monday API Token תקין." },
        { status: 400 }
      );
    }

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
  } catch {
    return NextResponse.json(
      { error: "שגיאה פנימית בשרת. נסו שוב." },
      { status: 500 }
    );
  }
}
