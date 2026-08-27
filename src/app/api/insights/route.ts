import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mondayQuery, requireMonday } from "@/lib/monday-server";
import * as BI from "@/lib/board-intelligence";

/**
 * "שמתי לב ש..." — phrased discoveries (NOT charts). Generic: derived from the
 * board's own columns/values, so it produces meaningful sentences for any
 * nonprofit. Never invents; every insight cites the column it came from.
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
         items_page(limit:300) { items { id name updated_at column_values { id text column { title type } } } }
       } }`,
      guard.token
    );

    const insights: Insight[] = [];
    for (const rb of data?.boards || []) {
      const b: BI.Board = {
        id: rb.id, name: rb.name, columns: rb.columns || [],
        items: (rb.items_page?.items || []).map((it: RawItem) => ({
          id: it.id, name: it.name,
          values: (it.column_values || []).map((cv) => ({ colId: cv.id, title: cv.column?.title || "", type: cv.column?.type || "", text: cv.text || "" })),
        })),
      };
      const term = BI.terminology(b);
      const N = b.items.length;

      // 1) attention
      const att = BI.attention(b).data as { count: number; items: { name: string; why: string }[] };
      if (att.count > 0) insights.push({ tone: "rose", icon: "▲", title: `${att.count} ${term.entityPlural} דורשים תשומת לב`, body: `למשל: ${att.items.slice(0, 3).map((x) => x.name).join("، ")}${att.count > 3 ? " ועוד" : ""}.`, source: `${b.name}` });

      // 2) empty-column gaps — real data-quality insight, generic
      for (const c of b.columns) {
        if (["name", "subtasks", "button", "creation_log", "last_updated"].includes(c.type)) continue;
        const filled = b.items.filter((it) => (it.values.find((v) => v.colId === c.id)?.text || "").trim()).length;
        const emptyPct = N ? Math.round(((N - filled) / N) * 100) : 0;
        if (emptyPct >= 50 && N >= 10) {
          insights.push({ tone: "amber", icon: "◌", title: `עמודת "${c.title}" ריקה ב-${emptyPct}%`, body: `רק ${filled} מתוך ${N} ${term.entityPlural} מולאו. פער שכדאי לסגור לפני דיווח.`, source: `${b.name} · "${c.title}"` });
          break; // one gap insight per board is enough
        }
      }

      // 3) dominant bucket of the main status column — a "story" fact
      const statusCol = b.columns.find((c) => ["status", "color", "dropdown"].includes(c.type));
      if (statusCol) {
        const bd = BI.breakdown(b, statusCol.title)?.data as { rows: { label: string; n: number }[] };
        const top = bd?.rows?.find((r) => r.label !== "— ריק —");
        if (top && N) insights.push({ tone: "grape", icon: "◆", title: `${statusCol.title} הנפוץ ביותר: "${top.label}"`, body: `${top.n} ${term.entityPlural} (${Math.round((top.n / N) * 100)}%).`, source: `${b.name} · "${statusCol.title}"` });
      }

      // 4) recency — how many updated recently vs stale (uses Monday updated_at)
      const now = Date.now();
      const stale = (rb.items_page?.items || []).filter((it: RawItem) => {
        const t = it.updated_at ? new Date(it.updated_at).getTime() : now;
        return (now - t) > 1000 * 60 * 60 * 24 * 90; // >90 days
      }).length;
      if (stale >= 5) insights.push({ tone: "amber", icon: "◔", title: `${stale} ${term.entityPlural} ללא עדכון מעל 3 חודשים`, body: `כדאי לבדוק שלא איבדתם איתם קשר.`, source: `${b.name} · עדכון אחרון` });
    }

    return NextResponse.json({ insights, boardNames: (data?.boards || []).map((b: { name: string }) => b.name) });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "שגיאה" }, { status: 502 });
  }
}

interface Insight { tone: string; icon: string; title: string; body: string; source: string; }
interface RawItem { id: string; name: string; updated_at?: string; column_values?: { id: string; text: string; column?: { title: string; type: string } }[]; }
