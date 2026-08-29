/**
 * sheet-to-board — a spreadsheet, translated into the shape the engine speaks.
 *
 * `board-intelligence.ts` does not know it is talking to Monday. It asks for
 * `Board { columns, items }` and works out what is worth showing. So anything
 * that can produce that shape produces a dashboard. This file produces it from
 * a delimited file, and NOTHING here touches the engine.
 *
 * ── The constraint that decides the whole design ──
 * The file never leaves the browser. Everything below is pure, synchronous and
 * dependency-free, so it runs inside the tab that opened the file: no upload,
 * no API route, no storage. Close the tab and it is gone.
 *
 * ── Rule 1: no hardcoded words ──
 * A spreadsheet carries no column types and no colours, so the type of every
 * column is inferred from the SHAPE OF ITS VALUES — how many parse as dates,
 * how many as numbers, how many distinct values there are, how long they are.
 * Nothing here reads a column's NAME, and there is no list of words anywhere in
 * this file. A sheet in Hebrew, Arabic or English is read identically.
 */

import { parseBoardDate, type Board, type Col, type Item, type ItemVal } from "@/lib/board-intelligence";

/* ═══════════════════════════════════════════════════════════════════════════
 * PART 1 — the delimited-file reader.
 *
 * Moved here verbatim from src/app/app/page.tsx (task T3), which still imports
 * it, so the Monday import screen keeps behaving exactly as it did. Behaviour
 * unchanged on purpose: it already handles , / ; / tab, a delimiter inside
 * quotes, a doubled quote as an escape, a line break inside a cell, CRLF, and
 * Excel's BOM. Only `looksLikeHeader`'s parameter was widened to a structural
 * type so a caller without Monday columns can use it too.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Which delimiter this file uses — counted on the first line, outside quotes. */
export function sniffDelimiter(text: string): string {
  const counts: Record<string, number> = { ",": 0, "\t": 0, ";": 0 };
  let quoted = false;
  for (const ch of text) {
    if (ch === "\"") { quoted = !quoted; continue; }
    if (quoted) continue;
    if (ch === "\n") break;
    if (ch in counts) counts[ch]++;
  }
  return Object.keys(counts).reduce((a, b) => (counts[b] > counts[a] ? b : a), ",");
}

/**
 * A real spreadsheet export is not "split on comma": a cell may hold the
 * delimiter or a line break inside quotes, and a quote inside a quoted cell is
 * written twice. Splitting naively turns one such row into two broken records.
 * This walks the text character by character instead, so a name with a comma
 * stays one name.
 */
export function parseDelimited(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");   // Excel writes a BOM before the first title
  const delim = sniffDelimiter(src);
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, started = false;
  const endCell = () => { row.push(cell.trim()); cell = ""; started = false; };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch !== "\"") { cell += ch; continue; }
      if (src[i + 1] === "\"") { cell += "\""; i++; } else quoted = false;
      continue;
    }
    if (ch === "\"" && !started) { quoted = true; started = true; continue; }
    if (ch === delim) { endCell(); continue; }
    if (ch === "\n") { endCell(); rows.push(row); row = []; continue; }
    if (ch === "\r") continue;
    cell += ch; started = true;
  }
  endCell(); rows.push(row);
  return rows;
}

/**
 * The first row, widened to the widest row in the file. A row further down may
 * carry more cells than the title row does; without this those cells would be
 * dropped without anyone being told, which is the bug this whole screen exists
 * to end. Widened, they show up in the mapping as unnamed columns.
 */
export function headRow(rows: string[][]): string[] {
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
  return Array.from({ length: width }, (_, i) => rows[0][i] || "");
}

/** Forgiving comparison of two column names: spacing and case are ignored. */
export const normKey = (s: string) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

/** First row = titles? Only if it names at least one real column of this board. */
export function looksLikeHeader(first: string[], targets: { title: string }[]): boolean {
  const titles = new Set(targets.map((t) => normKey(t.title)));
  return first.some((c) => c && titles.has(normKey(c)));
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PART 2 — reading a sheet's SHAPE.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** The four buckets a sheet column can land in — the engine's own vocabulary. */
export type SheetType = "status" | "date" | "numbers" | "text";

/**
 * Every threshold this file decides by, in one place, so the reasoning can be
 * argued with instead of hunted for. All of them count values; none of them
 * reads one.
 */
export const T = {
  /** A column is that type only if nearly all of its values parse that way; a
   *  handful of "לא ידוע" cells inside a date column must not disqualify it. */
  TYPE_SHARE: 0.9,
  /** A category is a small closed set. 8 is where a chart stops being readable. */
  STATUS_MAX_UNIQUE: 8,
  /** Under this many filled cells, repetition is a coincidence, not a pattern. */
  STATUS_MIN_VALUES: 6,
  /** …and each distinct value must come back this many times on average, so
   *  "8 distinct over 10 rows" is free text, exactly as the brief demands. */
  STATUS_MIN_REPEAT: 3,
  /** A label is a label. Anything longer is a sentence somebody typed. */
  STATUS_MAX_LEN: 40,
  /** An identifier is at least this many digits — shorter numbers are measures. */
  ID_MIN_DIGITS: 7,
  /** …and every value has the same length ±1 (a stripped leading zero). */
  ID_LEN_SPREAD: 1,
  /** Below three values "they are all unique" says nothing at all. */
  ID_MIN_VALUES: 3,
  /** A name column is filled and near-unique — that is all "name" means here. */
  NAME_MIN_FILL: 0.6,
  NAME_MIN_UNIQUE: 0.7,
} as const;

/** Does this cell read as a number? Thousand separators and a % are still one. */
export function isNumericValue(s: string): boolean {
  const v = s.trim().replace(/,/g, "").replace(/%$/, "");
  return v !== "" && /^[-+]?\d+(\.\d+)?$/.test(v);
}

/** Does this cell read as a date? The engine's own parser decides, so a sheet
 *  and a board never disagree about what a date is. */
export function isDateValue(s: string): boolean {
  return parseBoardDate(s) !== null;
}

/** Only the digits, so "052-1234" and "0521234" are the same length. */
const digitsOf = (s: string) => s.replace(/\D/g, "");

/**
 * 🔴 THE IDENTITY-NUMBER TRAP.
 *
 * A national-ID column is nine digits, so every test for "is this a number"
 * says yes — and then the engine faithfully reports "average: 312,847,221",
 * a number that looks like a finding and means nothing at all.
 *
 * An identifier is told apart from a measure by its SHAPE, never by its name:
 *  · it never repeats — an ID identifies exactly one row;
 *  · every value is the same length, and that length is long;
 *  · it is a whole number, never negative, never with a decimal point;
 *  · or it keeps a leading zero, which only a code does — a quantity written
 *    as 007 is still 7, so somebody meant those zeros.
 * Such a column is returned as `text`: countable, never averaged.
 */
export function looksLikeIdentifier(values: string[]): boolean {
  if (!values.length) return false;
  // A leading zero is a code on its own evidence — a measure never keeps one.
  if (values.every((v) => /^0\d/.test(v.trim()))) return true;
  if (values.length < T.ID_MIN_VALUES) return false;
  if (new Set(values).size !== values.length) return false;          // an ID never repeats
  if (values.some((v) => /[.]/.test(v) || /^-/.test(v.trim()))) return false;   // a measure, not a key
  const lens = values.map((v) => digitsOf(v).length);
  const min = Math.min(...lens), max = Math.max(...lens);
  return min >= T.ID_MIN_DIGITS && max - min <= T.ID_LEN_SPREAD;
}

/**
 * The type of one column, from its values alone.
 *
 * Order matters, and it is the order of the brief: a date is a date before it
 * is anything else; then numbers, with the identifier trap taken out of them;
 * then a small repeating set is a category; everything else is free text.
 */
export function inferType(values: string[]): { type: SheetType; identifier: boolean } {
  const vals = values.filter((v) => v !== "");
  const n = vals.length;
  if (!n) return { type: "text", identifier: false };

  const share = (f: (s: string) => boolean) => vals.filter(f).length / n;
  if (share(isDateValue) >= T.TYPE_SHARE) return { type: "date", identifier: false };

  const uniq = new Set(vals).size;
  const repeats = uniq <= T.STATUS_MAX_UNIQUE
    && n >= T.STATUS_MIN_VALUES
    && uniq * T.STATUS_MIN_REPEAT <= n
    && vals.every((v) => v.length <= T.STATUS_MAX_LEN);

  if (share(isNumericValue) >= T.TYPE_SHARE) {
    if (looksLikeIdentifier(vals)) return { type: "text", identifier: true };
    /* The same failure as the ID trap, one size down: a column of whole numbers
       that only ever holds a handful of values is a code (a grade, a class, a
       track), and summing codes produces another meaningless total. Repetition
       is what separates it from a real measure, so it is a category. */
    if (repeats && vals.every((v) => Number.isInteger(Number(v.replace(/,/g, ""))))) return { type: "status", identifier: false };
    return { type: "numbers", identifier: false };
  }

  if (repeats) return { type: "status", identifier: false };
  return { type: "text", identifier: false };
}

/* ── finding the table inside the file ──────────────────────────────────── */

const cellAt = (row: string[], j: number) => (row[j] || "").trim();
const isBlankRow = (row: string[]) => !row.some((c) => c.trim() !== "");

/**
 * The column the table hangs from: the one filled on more rows than any other,
 * leftmost when several tie. A banner or a note above the table fills a cell
 * here and there; the table itself fills this column on every single record.
 */
function spineColumn(rows: string[][]): number {
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
  let best = -1, bestFill = 0;
  for (let j = 0; j < width; j++) {
    const fill = rows.reduce((k, r) => k + (cellAt(r, j) ? 1 : 0), 0);
    if (fill > bestFill) { bestFill = fill; best = j; }   // ">" keeps the leftmost of a tie
  }
  return best;
}

/**
 * Where the table starts — which is how a header on row 4 or 5 is found without
 * anyone declaring where it is.
 *
 * Not "the first row that fills the spine": a title typed into the first cell
 * of the sheet fills it too, and then a report's banner becomes the column
 * names and its two decorative lines become records. What separates the table
 * from the decoration above it is CONTINUITY — the table fills the spine on
 * every row, one after another, while a banner fills it once and stops. So the
 * table is the LONGEST UNBROKEN RUN, and it starts at that run's first row.
 *
 * Only the start is taken from the run. Anything after it is kept as data, even
 * a row that leaves the spine empty: a record with no name is still a record,
 * and silently dropping rows is the bug this whole screen exists to end.
 */
function blockStart(rows: string[][], spine: number): number {
  let bestAt = 0, bestLen = 0, at = -1, len = 0;
  for (let i = 0; i < rows.length; i++) {
    if (cellAt(rows[i], spine)) {
      if (at < 0) at = i;
      if (++len > bestLen) { bestLen = len; bestAt = at; }
    } else { at = -1; len = 0; }
  }
  return bestLen ? bestAt : 0;
}

/**
 * 🔴 Is the first row of the table a header, or is it already a record?
 *
 * Guessing "header" when the row is a person's name silently deletes that
 * person from the dashboard, so the row has to prove it is DATA before it is
 * treated as data. The proof is agreement with the column underneath it: a cell
 * that is a number where the rest of the column is numbers, a date where the
 * rest are dates, or a value that shows up again further down the same column.
 * A title agrees with nothing below it. Half the row agreeing is enough.
 */
function looksLikeDataRow(row: string[], body: string[][], width: number): boolean {
  let considered = 0, agrees = 0;
  for (let j = 0; j < width; j++) {
    const cell = cellAt(row, j);
    if (!cell) continue;
    const below = body.map((r) => cellAt(r, j)).filter(Boolean);
    if (below.length < 2) continue;
    considered++;
    const share = (f: (s: string) => boolean) => below.filter(f).length / below.length;
    if (isDateValue(cell) && share(isDateValue) >= 0.7) { agrees++; continue; }
    if (isNumericValue(cell) && share(isNumericValue) >= 0.7) { agrees++; continue; }
    if (below.includes(cell)) agrees++;
  }
  return considered > 0 && agrees / considered >= 0.5;
}

/* ── what the confirmation screen is shown ──────────────────────────────── */

export interface SheetColumn {
  /** Its position in the file — also its stable id, so a retitle cannot break it. */
  index: number;
  id: string;
  title: string;
  type: SheetType;
  /** Why it was typed that way — the screen shows this, so nothing is magic. */
  identifier: boolean;
  filled: number;
  unique: number;
}

export interface SheetPlan {
  fileName: string;
  boardName: string;
  /** 1-based line in the file, so it can be said out loud. null = no header found. */
  headerLine: number | null;
  /** Lines above the table that were not part of it (a title, a note). */
  preambleLines: number;
  /** Rows inside the table that were blank end to end: counted, never shown. */
  blankRows: number;
  /** Named columns that held no value at all — dropped, and said so. */
  droppedColumns: string[];
  columns: SheetColumn[];
  /** The kept data rows, still at full file width; a column knows its index. */
  rows: string[][];
  /** Which column supplies each record's name, or null = numbered by row. */
  nameIndex: number | null;
  /** Nothing usable in the file — the screen says so instead of an empty board. */
  empty: boolean;
}

/** A generic column name for a file that carries no titles. Product language,
 *  not an assumption about anybody's data. */
const genericTitle = (i: number) => `עמודה ${i + 1}`;

/**
 * Read a delimited file into a plan: what was found, what was left out, and the
 * type guessed for each column. A plan is a PROPOSAL — the screen shows it and
 * the user may correct any type before a single number is computed.
 */
export function readSheet(fileName: string, text: string): SheetPlan {
  const boardName = fileName.replace(/\.[^.]+$/, "").trim() || fileName;
  const all = parseDelimited(text);
  /* A file that ends in a newline parses to one extra row holding one empty
     cell. That row was never in the sheet, so counting it as a blank row would
     report a skipped row that never existed. */
  if (all.length > 1 && all[all.length - 1].length <= 1 && !cellAt(all[all.length - 1], 0)) all.pop();
  const base: SheetPlan = {
    fileName, boardName, headerLine: null, preambleLines: 0, blankRows: 0,
    droppedColumns: [], columns: [], rows: [], nameIndex: null, empty: true,
  };
  const filled = all.filter((r) => !isBlankRow(r));
  if (!filled.length) return base;

  const width = all.reduce((m, r) => Math.max(m, r.length), 0);
  const spine = spineColumn(filled);
  const startInFilled = spine < 0 ? 0 : blockStart(filled, spine);
  const block = filled.slice(startInFilled);
  if (!block.length) return base;
  /* Said out loud on screen, so it has to be the line the user would count in
     her own file — blank lines included, counting from 1. */
  const startLine = all.indexOf(block[0]) + 1;

  // Header or first record? The row must prove it is data to be kept as data.
  const body = block.slice(1);
  const hasHeader = body.length > 0 && !looksLikeDataRow(block[0], body, width);
  const dataRows = hasHeader ? body : block;
  if (!dataRows.length) return { ...base, headerLine: null, preambleLines: startLine - 1 };

  /* Titles: the header row widened to the widest row in the FILE, because a
     record further down may carry cells the title row never named. Reusing the
     mover's own `headRow` for exactly that — it widens whatever it is handed. */
  const titlesRaw = hasHeader ? headRow([block[0], ...all]) : Array.from({ length: width }, () => "");

  const seen = new Map<string, number>();
  const columns: SheetColumn[] = [];
  const dropped: string[] = [];
  for (let j = 0; j < width; j++) {
    const values = dataRows.map((r) => cellAt(r, j)).filter(Boolean);
    const raw = (titlesRaw[j] || "").trim();
    if (!values.length) { if (raw) dropped.push(raw); continue; }   // 100% empty → not a column
    // Two columns may carry the same title; the engine looks widgets up by
    // title, so a duplicate has to be told apart or one of them disappears.
    let title = raw || genericTitle(j);
    const k = normKey(title), hit = (seen.get(k) || 0) + 1;
    seen.set(k, hit);
    if (hit > 1) title = `${title} (${hit})`;
    const { type, identifier } = inferType(values);
    columns.push({ index: j, id: `c${j}`, title, type, identifier, filled: values.length, unique: new Set(values).size });
  }
  if (!columns.length) return { ...base, headerLine: hasHeader ? startLine : null, preambleLines: startLine - 1 };

  return {
    fileName, boardName,
    headerLine: hasHeader ? startLine : null,
    preambleLines: startLine - 1,
    blankRows: all.length - filled.length,
    droppedColumns: dropped,
    columns,
    rows: dataRows,
    nameIndex: pickNameColumn(columns, dataRows),
    empty: false,
  };
}

/**
 * Which column names a record. A name is the column that is filled on nearly
 * every row and almost never repeats — that is a shape, and it is the only
 * thing "name" means here. An identifier column is passed over while a real
 * candidate exists: a row is better called by its name than by its key.
 */
function pickNameColumn(columns: SheetColumn[], rows: string[][]): number | null {
  const n = rows.length || 1;
  let best: number | null = null, bestScore = 0;
  for (const c of columns) {
    if (c.type !== "text") continue;
    const fill = c.filled / n, uniq = c.unique / Math.max(1, c.filled);
    if (fill < T.NAME_MIN_FILL || uniq < T.NAME_MIN_UNIQUE) continue;
    const score = fill * uniq * (c.identifier ? 0.5 : 1);   // a key only if nothing else
    if (score > bestScore) { bestScore = score; best = c.index; }
  }
  return best;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PART 3 — the plan, as the engine wants it.
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * The translation itself, and it is deliberately dull: the plan's types become
 * column types, the rows become items, and every question about what any of it
 * MEANS is left to `board-intelligence`, untouched. `settings_str` is left
 * unset on purpose — a spreadsheet carries no colours, and inventing them would
 * be inventing meaning the file does not hold.
 */
export function planToBoard(plan: SheetPlan): Board {
  const columns: Col[] = plan.columns.map((c) => ({ id: c.id, title: c.title, type: c.type }));
  const items: Item[] = plan.rows.map((row, i) => {
    const values: ItemVal[] = plan.columns.map((c) => ({
      colId: c.id, title: c.title, type: c.type, text: cellAt(row, c.index),
    }));
    const named = plan.nameIndex === null ? "" : cellAt(row, plan.nameIndex);
    return { id: `r${i}`, name: named || `שורה ${i + 1}`, values };
  });
  return { id: "sheet", name: plan.boardName, columns, items };
}
