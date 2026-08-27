import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireMonday } from "@/lib/monday-server";
import { fetchBoards, parseBoardIds, coverage } from "@/lib/board-fetch";
import * as BI from "@/lib/board-intelligence";

/**
 * "שמתי לב ש..." — phrased discoveries (NOT charts). Generic: derived from the
 * board's own columns/values, so it produces meaningful sentences for any
 * nonprofit. Never invents; every insight cites the column it came from — and,
 * when the board was too big to read in full, says so in the source line.
 */
export async function GET() {
  const guard = await requireMonday();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const ids = parseBoardIds((await cookies()).get("anyday_selected_boards")?.value);
  if (!ids.length) return NextResponse.json({ error: "בחרו בורד" }, { status: 400 });

  try {
    const boards = await fetchBoards(ids, guard.token);
    const insights: Insight[] = [];

    for (const b of boards) {
      const term = BI.terminology(b);
      const N = b.items.length;
      // Every insight below is computed on the items we actually read. If that
      // is only part of the board, say it out loud rather than implying "all".
      const sample = b.truncated ? ` · מדגם ${b.loaded} מתוך ${b.itemsCount}` : "";

      // 1) attention
      const att = BI.attention(b).data as { count: number; items: { name: string; why: string }[] };
      if (att.count > 0) insights.push({ tone: "rose", icon: "▲", title: `${att.count} ${term.entityPlural} דורשים תשומת לב`, body: `למשל: ${att.items.slice(0, 3).map((x) => x.name).join("، ")}${att.count > 3 ? " ועוד" : ""}.`, source: `${b.name}${sample}` });

      // 2) empty-column gaps — real data-quality insight, generic
      for (const c of b.columns) {
        if (["name", "subtasks", "button", "creation_log", "last_updated"].includes(c.type)) continue;
        const filled = b.items.filter((it) => (it.values.find((v) => v.colId === c.id)?.text || "").trim()).length;
        const emptyPct = N ? Math.round(((N - filled) / N) * 100) : 0;
        if (emptyPct >= 50 && N >= 10) {
          insights.push({ tone: "amber", icon: "◌", title: `עמודת "${c.title}" ריקה ב-${emptyPct}%`, body: `רק ${filled} מתוך ${N} ${term.entityPlural} מולאו. פער שכדאי לסגור לפני דיווח.`, source: `${b.name} · "${c.title}"${sample}` });
          break; // one gap insight per board is enough
        }
      }

      // 3) dominant bucket of the main status column — a "story" fact
      const statusCol = b.columns.find((c) => ["status", "color", "dropdown"].includes(c.type));
      if (statusCol) {
        const bd = BI.breakdown(b, statusCol.title)?.data as { rows: { label: string; n: number }[] };
        const top = bd?.rows?.find((r) => r.label !== "— ריק —");
        if (top && N) insights.push({ tone: "grape", icon: "◆", title: `${statusCol.title} הנפוץ ביותר: "${top.label}"`, body: `${top.n} ${term.entityPlural} (${Math.round((top.n / N) * 100)}%).`, source: `${b.name} · "${statusCol.title}"${sample}` });
      }

      // 4) recency — how many updated recently vs stale (uses Monday updated_at)
      const now = Date.now();
      const stale = b.items.filter((it) => {
        const t = it.updatedAt ? new Date(it.updatedAt).getTime() : now;
        return (now - t) > 1000 * 60 * 60 * 24 * 90; // >90 days
      }).length;
      if (stale >= 5) insights.push({ tone: "amber", icon: "◔", title: `${stale} ${term.entityPlural} ללא עדכון מעל 3 חודשים`, body: `כדאי לבדוק שלא איבדתם איתם קשר.`, source: `${b.name} · עדכון אחרון${sample}` });
    }

    return NextResponse.json({ insights, boardNames: boards.map((b) => b.name), coverage: coverage(boards) });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "שגיאה" }, { status: 502 });
  }
}

interface Insight { tone: string; icon: string; title: string; body: string; source: string; }
