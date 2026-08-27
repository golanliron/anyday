import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mondayQuery, requireMonday } from "@/lib/monday-server";
import * as BI from "@/lib/board-intelligence";

/**
 * Data for the "מפת האימפקט" constellation: one dot per item, grouped into
 * clusters by a category/status column, colored by status. Generic — the
 * cluster column and status column are found BY TYPE, so it works for any board.
 */
export async function GET() {
  const guard = await requireMonday();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const ids = (await cookies()).get("anyday_selected_boards")?.value?.split(",").filter(Boolean) || [];
  if (!ids.length) return NextResponse.json({ error: "בחרו בורד" }, { status: 400 });

  try {
    const data = await mondayQuery(
      `query { boards(ids:[${ids.join(",")}]) {
         id name columns { id title type }
         items_page(limit:400) { items { id name updated_at column_values { id text column { title type } } } }
       } }`,
      guard.token
    );

    const boardsOut = (data?.boards || []).map((rb: RawBoard) => {
      const cols: Col[] = rb.columns || [];
      // cluster column: prefer a dropdown/status that has several distinct values (e.g. תוכנית)
      const statusCols = cols.filter((c) => ["status", "color", "dropdown"].includes(c.type));
      const items = rb.items_page?.items || [];
      const valuesFor = (col: Col | undefined) => col ? items.map((it) => it.column_values?.find((cv) => cv.id === col.id)?.text || "").filter(Boolean) : [];
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

      const term = BI.terminology({ id: rb.id, name: rb.name, columns: cols, items: [] });
      const dots = items.map((it) => {
        const get = (col?: Col) => col ? (it.column_values?.find((cv) => cv.id === col.id)?.text || "") : "";
        const fields = (it.column_values || []).map((cv) => ({ title: cv.column?.title || "", text: cv.text || "" })).filter((f) => f.title && f.text);
        return {
          id: it.id, name: it.name,
          cluster: get(clusterCol) || "אחר",
          status: get(statusCol),
          updatedAt: it.updated_at || "",
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

    return NextResponse.json({ boards: boardsOut });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "שגיאה" }, { status: 502 });
  }
}

interface Col { id: string; title: string; type: string; }
interface RawItem { id: string; name: string; updated_at?: string; column_values?: { id: string; text: string; column?: { title: string; type: string } }[]; }
interface RawBoard { id: string; name: string; columns?: Col[]; items_page?: { items: RawItem[] }; }
