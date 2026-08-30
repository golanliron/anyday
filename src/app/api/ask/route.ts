import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mondayQuery, requireMonday } from "@/lib/monday-server";
import { fetchBoards, parseBoardIds, coverage, type FetchedBoard } from "@/lib/board-fetch";
import * as BI from "@/lib/board-intelligence";
import {
  writePayload, looksLikeWrite, resolveName, valueCandidates, matchLabel,
  labelsHtml, escapeHtml, labelsByColumn, STATUS_COLUMNS_QUERY,
} from "@/lib/chat-intent";

/**
 * The AnyDay chat brain. Reads the user's SELECTED Monday boards live and
 * answers questions about them. Works in two tiers:
 *  - Always: deterministic analysis over the real data (counts, breakdowns,
 *    stale/at-risk detection) — every answer grounded in a real source.
 *  - If ANTHROPIC_API_KEY is set: also handles free-form questions via Claude,
 *    fed with the real board data so it never fabricates.
 */
export async function POST(req: NextRequest) {
  const guard = await requireMonday();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { question } = await req.json().catch(() => ({ question: "" }));
  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "חסרה שאלה" }, { status: 400 });
  }

  // Which boards to read (selected, else the busiest few).
  const selected = parseBoardIds((await cookies()).get("anyday_selected_boards")?.value);
  let boardIds = selected;
  try {
    if (!boardIds.length) {
      const list = await mondayQuery(`query { boards(limit:5, order_by:used_at, state:active){ id } }`, guard.token);
      boardIds = (list?.boards || []).map((b: { id: string }) => String(b.id));
    }
  } catch { /* ignore */ }

  if (!boardIds.length) {
    return NextResponse.json({ answer: "עדיין לא בחרתם בורדים. חזרו למסך הבחירה כדי שאדע על מה להסתכל.", source: null });
  }

  // Pull the selected boards with columns + ALL of their items (paginated).
  let boards: FetchedBoard[] = [];
  try {
    boards = await fetchBoards(boardIds, guard.token);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "שגיאה בקריאת הבורד" }, { status: 502 });
  }

  const cov = coverage(boards);
  const source = boards.map((b) => b.name).join(" · ") + (cov.truncated ? ` · ${cov.note}` : "");

  // ── WRITE-INTENT detection: "סמן/עדכן את <שם> כ/ל<ערך>" ──
  const payload = writePayload(question);
  if (payload) {
    const written = await respondToUpdate(payload, boards, guard.token, source);
    if (written) return written;   // null = read it as a question after all
  }

  // ── Intent routing: build canvas widgets from the generic engine ──
  const widgets = buildWidgets(question, boards);

  // Tier 2: if an AI key exists, let Claude phrase the answer with real data.
  const key = process.env.ANTHROPIC_API_KEY;
  if (key && key.trim().length > 10 && question !== "__overview__") {
    try {
      const aiAnswer = await askClaude(key, question, boards);
      if (aiAnswer) return NextResponse.json({ answer: aiAnswer, source, ai: true, widgets, coverage: cov });
    } catch { /* fall through */ }
  }

  // Tier 1: deterministic phrasing grounded in the real data.
  const det = analyze(question, boards, widgets);
  return NextResponse.json({ answer: det.answer, source, ai: false, widgets, coverage: cov });
}

/**
 * A board's status columns and the labels each one actually allows.
 *
 * DEBT (documented in anyday-ops/reports/T1.md): `board-fetch.ts` already reads
 * this board's columns, but not their `settings_str`, and it is owned by
 * another task right now — so the label list is read here with one small extra
 * query. Worth folding into fetchBoards once that task lands.
 */
async function statusLabels(boardId: string, token: string): Promise<Record<string, string[]>> {
  try {
    const data = await mondayQuery(STATUS_COLUMNS_QUERY, token, { ids: [String(boardId)] });
    return labelsByColumn(data);
  } catch {
    return {};   // labels unavailable → don't block the user, just skip validation
  }
}

/**
 * Turn "סמן את יוסי כהן כסיים" into a confirmable action card.
 *
 * Where the name ends is decided by the board's own item names (longest match
 * wins), not by Hebrew grammar — so a name that starts with כ/ל no longer
 * splits in the middle. Nothing is written here: an unknown value or an
 * ambiguous name comes back as an answer that offers the real options.
 * Returns null when the sentence should fall through to the normal Q&A path.
 */
async function respondToUpdate(
  payload: string,
  boards: FetchedBoard[],
  token: string,
  source: string,
): Promise<NextResponse | null> {
  const withStatus = boards.filter((b) => b.columns.some((c) => ["status", "color"].includes(c.type)));
  const pool = withStatus.length ? withStatus : boards;
  const found = resolveName(
    payload,
    pool.map((b) => ({ id: b.id, name: b.name, items: b.items.map((it) => ({ id: it.id, name: it.name })) })),
  );

  if (found.kind === "none") {
    if (!looksLikeWrite(payload)) return null;
    return NextResponse.json({
      answer: `לא מצאתי "<b>${escapeHtml(payload)}</b>" בבורדים שבחרת, אז לא שיניתי כלום. כתבי את השם בדיוק כפי שהוא מופיע בבורד.`,
      source,
    });
  }

  if (found.kind === "many") {
    const manyBoards = new Set(found.matches.map((m) => m.board.id)).size > 1;
    const shown = found.matches.slice(0, 8)
      .map((m) => `<b>${escapeHtml(m.item.name)}</b>${manyBoards ? ` (${escapeHtml(m.board.name)})` : ""}`)
      .join(" · ");
    const more = found.matches.length > 8 ? ` ועוד ${found.matches.length - 8}` : "";
    return NextResponse.json({
      answer: `ל"<b>${escapeHtml(found.matched)}</b>" יש יותר מהתאמה אחת: ${shown}${more}. לא שיניתי כלום — כתבי את השם המלא כדי שאדע במי מדובר.`,
      source,
    });
  }

  const { item, board } = found.matches[0];
  const full = boards.find((b) => b.id === board.id);
  const statusCol = full?.columns.find((c) => ["status", "color"].includes(c.type));
  if (!full || !statusCol) {
    return NextResponse.json({
      answer: `מצאתי את <b>${escapeHtml(item.name)}</b>, אבל אין בבורד עמודת סטטוס לעדכן.`,
      source,
    });
  }

  const fullItem = full.items.find((it) => it.id === item.id);
  const current = fullItem?.values.find((v) => v.colId === statusCol.id)?.text || "—";
  const allowed = (await statusLabels(full.id, token))[statusCol.id] || [];
  const options = allowed.length ? ` הערכים שקיימים בעמודה <b>${escapeHtml(statusCol.title)}</b>: ${labelsHtml(allowed)}.` : "";
  const candidates = valueCandidates(found.rest);

  if (!candidates.length) {
    return NextResponse.json({
      answer: `מצאתי את <b>${escapeHtml(item.name)}</b>, אבל לא כתוב לאיזה ערך לעדכן.${options}`,
      source,
    });
  }

  let value = candidates[0];
  if (allowed.length) {
    const hit = matchLabel(candidates, allowed);
    if (!hit) {
      const asked = candidates[candidates.length - 1];
      return NextResponse.json({
        answer: `"<b>${escapeHtml(asked)}</b>" לא קיים בעמודה <b>${escapeHtml(statusCol.title)}</b>, אז לא שיניתי כלום.${options}`,
        source,
      });
    }
    value = hit;   // write the board's own spelling, not the user's
  }

  return NextResponse.json({
    action: {
      type: "update-status", personName: item.name, boardId: full.id, boardName: full.name,
      itemId: item.id, columnId: statusCol.id, columnTitle: statusCol.title, from: current, to: value,
    },
    answer: `רוצה לעדכן את <b>${escapeHtml(item.name)}</b>: ${escapeHtml(statusCol.title)} מ-"${escapeHtml(current)}" ל-"<b>${escapeHtml(value)}</b>". מאשרת?`,
    source,
  });
}

/** Route the user's question to the generic board-intelligence widget builders. */
function buildWidgets(q: string, boards: BI.Board[]): BI.Widget[] {
  const out: BI.Widget[] = [];
  const isOverview = q === "__overview__" || /דשבורד|תמונת מצב|סקירה|הכל/.test(q);
  const wantAttention = /סיכון|תשומת לב|בעיה|דחוף|תקוע|נשיר/.test(q);
  const wantBreakdown = /כמה|פילוח|התפלג|חלוק|סטטוס|מצב/.test(q);
  const wantOwner = /מי אחראי|לפי אחראי|רכז|עומס|מלווה/.test(q);
  const wantList = /רשימה|הצג|הראה|תראה/.test(q);

  for (const b of boards) {
    if (isOverview) { out.push(...BI.autoWidgets(b)); continue; }
    if (wantAttention) { out.push(BI.attention(b)); }
    if (wantBreakdown) { const w = BI.breakdown(b); if (w) out.push(w); }
    if (wantOwner) { const w = BI.byOwner(b); if (w) out.push(w); }
    if (wantList) { out.push(BI.list(b)); }
  }
  // If nothing matched a specific intent, give an auto dashboard.
  if (!out.length && !isOverview) for (const b of boards) out.push(...BI.autoWidgets(b));
  return out.slice(0, 6);
}

// ── deterministic phrasing that references the widgets we built ──
function analyze(q: string, boards: FetchedBoard[], widgets: BI.Widget[]): { answer: string; source: string } {
  void q;
  const source = boards.map((b) => b.name).join(" · ");
  const total = boards.reduce((s, b) => s + b.items.length, 0);
  const att = widgets.find((w) => w.kind === "attention");
  const bd = widgets.find((w) => w.kind === "breakdown");
  const parts: string[] = [];
  parts.push(`הסתכלתי על ${boards.length} בורד${boards.length > 1 ? "ים" : ""} (${source}) — ${total} פריטים בסך הכל.`);
  if (bd) {
    const dd = bd.data as { rows: { label: string; n: number }[] };
    const top = dd.rows[0];
    if (top) parts.push(`הקבוצה הכי גדולה ב"${bd.title.replace("פילוח לפי ", "")}": <b>${top.label}</b> (${top.n}).`);
  }
  if (att) { const c = (att.data as { count: number }).count; parts.push(c ? `<b>${c}</b> פריטים נראים דורשים תשומת לב.` : "לא זיהיתי פריטים בסיכון."); }
  parts.push("בניתי לך תצוגות במשטח ← אפשר להמשיך לשאול.");
  return { answer: parts.join(" "), source };
}

// ── Claude (optional tier 2) ──
async function askClaude(key: string, question: string, boards: FetchedBoard[]): Promise<string | null> {
  // Compact the real board data into a context block (never fabricate).
  const ctx = boards.map((b) => {
    const cols = b.columns.map((c) => `${c.title}(${c.type})`).join(", ");
    const sample = b.items.slice(0, 40).map((it) => {
      const vals = it.values.filter((v) => v.text).map((v) => `${v.title}=${v.text}`).join("; ");
      return `- ${it.name}${vals ? ` | ${vals}` : ""}`;
    }).join("\n");
    return `## בורד: ${b.name} (${b.items.length} פריטים)\nעמודות: ${cols}\nדוגמת פריטים:\n${sample}`;
  }).join("\n\n");

  const system = `אתה AnyDay — עוזר חכם לארגונים שמנתח נתוני Monday.com בעברית.
ענה קצר, מדויק, וחם. השתמש אך ורק בנתונים שקיבלת — לעולם אל תמציא מספרים או פרטים. אם המידע לא קיים בנתונים, אמור "אין לי את זה בבורדים שבחרתם". סיים תמיד עם ציון המקור (שם הבורד).`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 900,
      system,
      messages: [{ role: "user", content: `הנתונים מה-Monday שלי:\n\n${ctx}\n\n---\nשאלה: ${question}` }],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const block = (data?.content || []).find((b: { type: string }) => b.type === "text");
  return block?.text || null;
}
