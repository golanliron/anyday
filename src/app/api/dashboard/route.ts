import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mondayQuery, requireMonday } from "@/lib/monday-server";
import * as BI from "@/lib/board-intelligence";

/**
 * Smart dashboard data for one or more boards. Generic (works by column TYPE),
 * so it produces a rich, real dashboard for ANY nonprofit's board:
 *  - headline KPIs (total, at-risk, stale, completed-share)
 *  - every status column as a breakdown chart
 *  - owner distribution, number summaries, attention list
 * Accepts ?boards=id,id to override the saved selection (right-rail picker).
 */
export async function GET(req: NextRequest) {
  const guard = await requireMonday();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const override = req.nextUrl.searchParams.get("boards");
  const saved = (await cookies()).get("anyday_selected_boards")?.value;
  const ids = (override || saved || "").split(",").filter(Boolean);
  if (!ids.length) return NextResponse.json({ error: "בחרו בורד" }, { status: 400 });

  try {
    const data = await mondayQuery(
      `query { boards(ids:[${ids.join(",")}]) {
         id name items_count
         columns { id title type }
         items_page(limit:300) { items { id name updated_at column_values { id text column { title type } } } }
       } }`,
      guard.token
    );

    const biBoards: BI.Board[] = (data?.boards || []).map((b: RawBoard) => ({
      id: b.id, name: b.name,
      columns: b.columns || [],
      items: (b.items_page?.items || []).map((it) => ({
        id: it.id, name: it.name,
        values: (it.column_values || []).map((cv) => ({ colId: cv.id, title: cv.column?.title || "", type: cv.column?.type || "", text: cv.text || "" })),
      })),
    }));

    // KPIs are DERIVED per board — no hardcoded "active/completed" that only
    // fit graduates. For one board we use its own headline KPIs; for two we
    // show a compact per-board summary.
    const kpis = biBoards.length === 1
      ? BI.headlineKpis(biBoards[0])
      : biBoards.flatMap((b) => {
          const term = BI.terminology(b);
          const att = (BI.attention(b).data as { count: number }).count;
          return [
            { icon: "◆", n: b.items.length, label: `${term.entityPlural} · ${b.name}`, tone: "brand" },
            ...(att ? [{ icon: "▲", n: att, label: `טעונים בדיקה · ${b.name}`, tone: "rose" }] : []),
          ];
        }).slice(0, 4);

    let atRisk = 0;
    const charts: (BI.Widget & { drill?: Record<string, string[]> })[] = [];
    const attentionItems: { name: string; why: string; board: string }[] = [];

    for (const b of biBoards) {
      const statusCols = b.columns.filter((c) => ["status", "color", "dropdown"].includes(c.type));
      for (const c of statusCols) {
        const w = BI.breakdown(b, c.title);
        if (w) {
          // drill-down: for each bucket value, the list of item names in it
          const drill: Record<string, string[]> = {};
          for (const it of b.items) {
            const v = it.values.find((x) => x.colId === c.id)?.text || "— ריק —";
            (drill[v] ||= []).push(it.name);
          }
          charts.push({ ...w, title: `${w.title}${biBoards.length > 1 ? ` · ${b.name}` : ""}`, drill });
        }
      }
      const owner = BI.byOwner(b);
      if (owner && (owner.data as { rows: unknown[] }).rows.length > 1) charts.push({ ...owner, title: `${owner.title}${biBoards.length > 1 ? ` · ${b.name}` : ""}` });
      const num = BI.numberSummary(b);
      if (num) charts.push(num);

      const items = (BI.attention(b).data as { items: { name: string; why: string }[] }).items;
      items.forEach((it) => attentionItems.push({ ...it, board: b.name }));
      atRisk += items.length;
    }

    return NextResponse.json({
      boardNames: biBoards.map((b) => b.name),
      kpis,
      charts: charts.slice(0, 8),
      attention: { count: atRisk, items: attentionItems.slice(0, 8) },
      source: biBoards.map((b) => b.name).join(" · "),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "שגיאה" }, { status: 502 });
  }
}

interface RawBoard { id: string; name: string; items_count: number; columns?: { id: string; title: string; type: string }[]; items_page?: { items: RawItem[] }; }
interface RawItem { id: string; name: string; updated_at?: string; column_values?: { id: string; text: string; column?: { title: string; type: string } }[]; }
