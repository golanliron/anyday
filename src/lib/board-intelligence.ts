// The generic "board intelligence" engine.
// It works by Monday COLUMN TYPES, never by column NAMES — so it adapts to any
// nonprofit's structure, in any language. Given a board's columns + items, it
// figures out which analyses/visualizations are meaningful and computes them.

export interface Col { id: string; title: string; type: string; }
export interface ItemVal { colId: string; title: string; type: string; text: string; }
export interface Item { id: string; name: string; values: ItemVal[]; }
export interface Board { id: string; name: string; columns: Col[]; items: Item[]; }

export interface Widget {
  kind: "breakdown" | "byOwner" | "timeline" | "numberSummary" | "list" | "attention";
  title: string;
  source: string;
  data: unknown;
}

// Map raw Monday types to our semantic buckets.
const isStatus = (t: string) => t === "status" || t === "color" || t === "dropdown";
const isDate = (t: string) => t === "date" || t === "timeline" || t === "creation_log" || t === "last_updated";
const isPeople = (t: string) => t === "people" || t === "person";
const isNumber = (t: string) => t === "numbers" || t === "rating";

/** Values that look like they need attention, in Hebrew or English. */
const RISK_WORDS = ["סיכון", "תקוע", "עצר", "נשיר", "דחוף", "בעיה", "ממתין", "חריג", "risk", "stuck", "blocked", "urgent", "overdue"];

function valueOf(item: Item, col: Col): string {
  return item.values.find((v) => v.colId === col.id || v.title === col.title)?.text || "";
}

/** What CAN this board show? Returns the menu of possible widgets (for the chat/canvas). */
export function capabilities(board: Board): { kind: Widget["kind"]; label: string; col?: string }[] {
  const caps: { kind: Widget["kind"]; label: string; col?: string }[] = [];
  const statusCols = board.columns.filter((c) => isStatus(c.type));
  const dateCols = board.columns.filter((c) => isDate(c.type));
  const peopleCols = board.columns.filter((c) => isPeople(c.type));
  const numCols = board.columns.filter((c) => isNumber(c.type));

  statusCols.forEach((c) => caps.push({ kind: "breakdown", label: `פילוח לפי "${c.title}"`, col: c.title }));
  peopleCols.forEach((c) => caps.push({ kind: "byOwner", label: `חלוקה לפי "${c.title}"`, col: c.title }));
  dateCols.forEach((c) => caps.push({ kind: "timeline", label: `ציר זמן לפי "${c.title}"`, col: c.title }));
  numCols.forEach((c) => caps.push({ kind: "numberSummary", label: `סיכום "${c.title}"`, col: c.title }));
  if (statusCols.length) caps.push({ kind: "attention", label: "מי דורש תשומת לב" });
  caps.push({ kind: "list", label: "רשימת הפריטים" });
  return caps;
}

/** Compute a breakdown of items by a status-type column. */
export function breakdown(board: Board, colTitle?: string): Widget | null {
  const col = colTitle ? board.columns.find((c) => c.title === colTitle && isStatus(c.type))
    : board.columns.find((c) => isStatus(c.type));
  if (!col) return null;
  const counts: Record<string, number> = {};
  for (const it of board.items) {
    const v = valueOf(it, col) || "— ריק —";
    counts[v] = (counts[v] || 0) + 1;
  }
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, n }));
  return { kind: "breakdown", title: `פילוח לפי "${col.title}"`, source: `בורד "${board.name}" · עמודת "${col.title}"`, data: { rows, total: board.items.length } };
}

/** Distribution by a people-type column (workload by owner). */
export function byOwner(board: Board, colTitle?: string): Widget | null {
  const col = colTitle ? board.columns.find((c) => c.title === colTitle && isPeople(c.type))
    : board.columns.find((c) => isPeople(c.type));
  if (!col) return null;
  const counts: Record<string, number> = {};
  for (const it of board.items) {
    const v = valueOf(it, col) || "— ללא —";
    v.split(",").map((s) => s.trim()).filter(Boolean).forEach((name) => { counts[name] = (counts[name] || 0) + 1; });
  }
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, n }));
  return { kind: "byOwner", title: `חלוקה לפי "${col.title}"`, source: `בורד "${board.name}" · עמודת "${col.title}"`, data: { rows } };
}

/** Items that look like they need attention (risky status values). */
export function attention(board: Board): Widget {
  const hits: { name: string; why: string }[] = [];
  const statusCols = board.columns.filter((c) => isStatus(c.type));
  for (const it of board.items) {
    for (const c of statusCols) {
      const v = valueOf(it, c);
      if (v && RISK_WORDS.some((r) => v.includes(r))) { hits.push({ name: it.name, why: `${c.title}: ${v}` }); break; }
    }
  }
  return { kind: "attention", title: "דורשים תשומת לב", source: `בורד "${board.name}"`, data: { items: hits, count: hits.length } };
}

/** Summary of a number column (sum / avg / max). */
export function numberSummary(board: Board, colTitle?: string): Widget | null {
  const col = colTitle ? board.columns.find((c) => c.title === colTitle && isNumber(c.type))
    : board.columns.find((c) => isNumber(c.type));
  if (!col) return null;
  const nums = board.items.map((it) => parseFloat(valueOf(it, col))).filter((n) => !isNaN(n));
  if (!nums.length) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return { kind: "numberSummary", title: `סיכום "${col.title}"`, source: `בורד "${board.name}" · עמודת "${col.title}"`,
    data: { sum, avg: Math.round((sum / nums.length) * 10) / 10, max: Math.max(...nums), count: nums.length } };
}

/** A plain list of items. */
export function list(board: Board, limit = 12): Widget {
  return { kind: "list", title: `רשימת "${board.name}"`, source: `בורד "${board.name}"`,
    data: { items: board.items.slice(0, limit).map((it) => it.name), total: board.items.length } };
}

/**
 * Derive the vocabulary for a board WITHOUT hardcoding any nonprofit's terms.
 * "entityWord" = what to call a row (בוגר/מוטב/בעל-חיים/משפחה). We guess from the
 * board name; if unsure we fall back to the neutral "רשומות". Never invents.
 */
export function terminology(board: Board): { entity: string; entityPlural: string } {
  const n = board.name;
  // pull a leading noun-ish token from the board name if it looks like a plural entity
  const known: [RegExp, string, string][] = [
    [/בוגר/, "בוגר", "בוגרים"],
    [/מוטב/, "מוטב", "מוטבים"],
    [/תלמיד/, "תלמיד", "תלמידים"],
    [/משפח/, "משפחה", "משפחות"],
    [/מתנדב/, "מתנדב", "מתנדבים"],
    [/נער|נוער/, "נער", "בני נוער"],
    [/לקוח/, "לקוח", "לקוחות"],
    [/מטופל/, "מטופל", "מטופלים"],
    [/חייל/, "חייל", "חיילים"],
    [/קשיש|זקן/, "קשיש", "קשישים"],
    [/חיה|בעל.?ח/, "בעל חיים", "בעלי חיים"],
    [/איש קשר|אנשי קשר/, "איש קשר", "אנשי קשר"],
  ];
  for (const [re, s, p] of known) if (re.test(n)) return { entity: s, entityPlural: p };
  return { entity: "רשומה", entityPlural: "רשומות" };
}

/**
 * Build headline KPIs that are MEANINGFUL for THIS board, derived from its own
 * columns — never the fixed "active/completed" that only fit graduates.
 * Rule: total (always), + for each status column: the size of its largest
 * bucket labeled with that bucket's real value, + attention count (only if a
 * status column has risky-looking values), + number-column sum (if any).
 */
export function headlineKpis(board: Board): { icon: string; n: number; label: string; tone: string }[] {
  const term = terminology(board);
  const out: { icon: string; n: number; label: string; tone: string }[] = [];
  out.push({ icon: "◆", n: board.items.length, label: `סה"כ ${term.entityPlural}`, tone: "brand" });

  const statusCols = board.columns.filter((c) => isStatus(c.type));
  if (statusCols.length) {
    // biggest bucket of the first status column — label = its real value
    const bd = breakdown(board, statusCols[0].title);
    const rows = (bd?.data as { rows: { label: string; n: number }[] })?.rows || [];
    const top = rows.find((r) => r.label !== "— ריק —") || rows[0];
    if (top) out.push({ icon: "●", n: top.n, label: `${statusCols[0].title}: ${top.label}`, tone: "mint" });

    // attention only if there ARE risky values
    const att = attention(board);
    const c = (att.data as { count: number }).count;
    if (c > 0) out.push({ icon: "▲", n: c, label: "טעונים בדיקה", tone: "rose" });
  }

  const numCol = board.columns.find((c) => isNumber(c.type));
  if (numCol) {
    const ns = numberSummary(board, numCol.title);
    if (ns) out.push({ icon: "∑", n: (ns.data as { sum: number }).sum, label: `סך "${numCol.title}"`, tone: "amber" });
  }
  return out.slice(0, 4);
}

/** Auto-build the most useful default widgets for a board, in priority order. */
export function autoWidgets(board: Board): Widget[] {
  const out: Widget[] = [];
  const b = breakdown(board); if (b) out.push(b);
  const a = attention(board); if ((a.data as { count: number }).count > 0) out.push(a);
  const o = byOwner(board); if (o && (o.data as { rows: unknown[] }).rows.length > 1) out.push(o);
  const n = numberSummary(board); if (n) out.push(n);
  if (out.length < 2) out.push(list(board));
  return out;
}
