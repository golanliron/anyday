import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireMonday } from "@/lib/monday-server";
import { fetchBoards, parseBoardIds, coverage, type FetchedBoard } from "@/lib/board-fetch";
import * as BI from "@/lib/board-intelligence";

/**
 * Data for the "מפת האימפקט" constellation: one dot per item, grouped into
 * clusters by a category/status column, colored by status. Generic — the
 * cluster column and status column are found BY TYPE, so it works for any board.
 */
export async function GET() {
  const guard = await requireMonday();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const ids = parseBoardIds((await cookies()).get("anyday_selected_boards")?.value);
  if (!ids.length) return NextResponse.json({ error: "בחרו בורד" }, { status: 400 });

  try {
    const fetched = await fetchBoards(ids, guard.token);

    const boardsOut = fetched.map((rb: FetchedBoard) => {
      const cols = rb.columns;
      // cluster column: prefer a dropdown/status that has several distinct values (e.g. תוכנית)
      const statusCols = cols.filter((c) => ["status", "color", "dropdown"].includes(c.type));
      const items = rb.items;
      const valuesFor = (col: Col | undefined) => col ? items.map((it) => it.values.find((cv) => cv.colId === col.id)?.text || "").filter(Boolean) : [];
      // Pick the BEST cluster column: one that splits items into BALANCED groups,
      // not dominated by a single value or mostly empty. Score by a "balance"
      // metric = distinct buckets (2-8 ideal) with good fill and no >70% giant.
      let clusterCol: Col | undefined, bestScore = -1;
      for (const c of statusCols) {
        const vals = valuesFor(c);
        const fill = vals.length / (items.length || 1);
        const counts: Record<string, number> = {}; vals.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
        const distinct = Object.keys(counts).length;
        if (distinct < 2 || distinct > 9) continue;
        const biggest = Math.max(...Object.values(counts)) / (vals.length || 1);
        // reward fill + several buckets, penalize a giant dominant bucket
        const score = fill * 2 + Math.min(distinct, 6) * 0.4 - (biggest > 0.7 ? 1.5 : 0);
        if (score > bestScore) { bestScore = score; clusterCol = c; }
      }
      if (!clusterCol) clusterCol = statusCols[0];
      const statusCol = statusCols.find((c) => c.id !== clusterCol?.id) || clusterCol;

      const term = BI.terminology(rb);
      const dots = items.map((it) => {
        const get = (col?: Col) => col ? (it.values.find((cv) => cv.colId === col.id)?.text || "") : "";
        const fields = it.values.map((cv) => ({ title: cv.title, text: cv.text })).filter((f) => f.title && f.text);
        return {
          id: it.id, name: it.name,
          cluster: get(clusterCol) || "אחר",
          status: get(statusCol),
          updatedAt: it.updatedAt,
          fields,
        };
      });
      // cluster summary
      const clusters: Record<string, number> = {};
      dots.forEach((d) => { clusters[d.cluster] = (clusters[d.cluster] || 0) + 1; });

      return {
        boardId: rb.id, boardName: rb.name, entity: term.entityPlural,
        clusterTitle: clusterCol?.title || "", statusTitle: statusCol?.title || "",
        clusters: Object.entries(clusters).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n })),
        dots,
      };
    });

    return NextResponse.json({ boards: boardsOut, coverage: coverage(fetched) });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "שגיאה" }, { status: 502 });
  }
}

interface Col { id: string; title: string; type: string; }
