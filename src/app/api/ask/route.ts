import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mondayQuery, requireMonday } from "@/lib/monday-server";
import { fetchBoards, parseBoardIds, coverage, type FetchedBoard } from "@/lib/board-fetch";
import * as BI from "@/lib/board-intelligence";

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

  // ── WRITE-INTENT detection: "סמן/עדכן את <שם> כ/ל <סטטוס>" ──
  const intent = detectUpdateIntent(question);
  if (intent) {
    // Find the person + status column so the client can show a "what changes" card.
    for (const b of boards) {
      const statusCol = b.columns.find((c) => ["status", "color"].includes(c.type));
      if (!statusCol) continue;
      const item = b.items.find((it) => it.name.includes(intent.name) || intent.name.includes(it.name));
      if (!item) continue;
      const current = item.values.find((v) => v.colId === statusCol.id)?.text || "—";
      return NextResponse.json({
        action: {
          type: "update-status", personName: item.name, boardId: b.id, boardName: b.name,
          itemId: item.id, columnId: statusCol.id, columnTitle: statusCol.title, from: current, to: intent.status,
        },
        answer: `רוצה לעדכן את <b>${item.name}</b>: ${statusCol.title} מ-"${current}" ל-"<b>${intent.status}</b>". מאשרת?`,
        source,
      });
    }
    return NextResponse.json({ answer: `לא מצאתי את "${intent.name}" בבורדים שבחרת (או שאין עמודת סטטוס). בדקי את השם.`, source });
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

/** Detect a status-update request in Hebrew, e.g.:
 *  "סמן את דנה כבוגרת פעילה" / "עדכן את יוסי ל'סיים תוכנית'" / "תשנה את מיכל לבטיפול" */
function detectUpdateIntent(q: string): { name: string; status: string } | null {
  // patterns: (סמן|עדכן|תעדכן|שנה|תשנה) את <name> (כ|ל|לסטטוס) <status>
  const m = q.match(/(?:סמן|סמני|עדכן|עדכני|תעדכן|שנה|תשנה|העבר|תעביר)\s+(?:את\s+)?(.+?)\s+(?:כ|ל|לסטטוס\s+|למצב\s+)['"]?(.+?)['"]?$/);
  if (!m) return null;
  const name = m[1].trim().replace(/^["']|["']$/g, "");
  const status = m[2].trim().replace(/^["']|["']$/g, "");
  if (!name || !status || name.length > 40) return null;
  return { name, status };
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

  const system = `אתה AnyDay — עוזר חכם לעמותות שמנתח נתוני Monday.com בעברית.
ענה קצר, מדויק, וחם. השתמש אך ורק בנתונים שקיבלת — לעולם אל תמציא מספרים או פרטים. אם המידע לא קיים בנתונים, אמור "אין לי את זה בבורדים שבחרתם". סיים תמיד עם ציון המקור (שם הבורד).`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
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
