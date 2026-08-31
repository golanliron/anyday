// Chat write-intent parsing — the part with no I/O, so it can be reasoned about
// (and tested) on its own.
//
// The old parser guessed where a person's name ended by looking for the Hebrew
// prefix letters כ/ל. That is a grammar guess, and it breaks on every name that
// simply STARTS with one of those letters ("יוסי כהן כסיים" → name "יוסי").
// Here the split is decided by DATA instead: the text after the verb is matched
// against the item names that were actually read from the board, longest match
// wins, and whatever is left over is the requested value. No name list, no
// language rules about content — only the board's own names.
//
// Everything below is pure: no fetch, no imports. The two chat routes
// (api/ask, api/action) do the Monday calls and hand the results in here.

export interface IntentItem { id: string; name: string }
export interface IntentBoard { id: string; name: string; items: IntentItem[] }

/** One item that could be the thing the sentence referred to. */
export interface NameMatch { item: IntentItem; board: IntentBoard }

export interface NameResolution {
  /** none = nothing on the board matched; many = ambiguous, must ask */
  kind: "none" | "one" | "many";
  matches: NameMatch[];
  /** the slice of the sentence that was recognised as the item name */
  matched: string;
  /** what followed it — the requested value, still un-cleaned */
  rest: string;
}

/**
 * Imperative openings that mean "change something", not "tell me something".
 * These are verbs of the PRODUCT's language, not words that describe any
 * organisation's content (see RULES.md §1). "את" is optional.
 */
const WRITE_VERBS =
  /(?:סמן|סמני|תסמן|תסמני|עדכן|עדכני|תעדכן|תעדכני|שנה|שני|תשנה|תשני|העבר|העברי|תעביר|תעבירי)\s+(?:את\s+)?(.+)$/;

/** Connectors that may sit between the name and the requested value. */
const VALUE_LEAD = /^(?:לסטטוס|למצב|לערך)\s+/;

/** Strip niqqud, quotes and bidi marks so comparisons survive typing habits. */
export function normalize(s: string): string {
  return (s || "")
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/["'`״׳‘’“”]/g, "")
    .replace(/[\u200E\u200F\u202A-\u202E]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Text that goes into an `answer` (rendered as HTML by the client). */
export function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The sentence after the verb, or null when this is not a write request. */
export function writePayload(question: string): string | null {
  const m = (question || "").match(WRITE_VERBS);
  if (!m) return null;
  const payload = m[1].replace(/\s+/g, " ").trim();
  return payload || null;
}

/**
 * Does the leftover text look like "…<something> כ/ל<value>"? Used only to
 * decide whether an unmatched sentence deserves a "didn't find that one"
 * answer or should just fall through to the normal Q&A path.
 */
export function looksLikeWrite(payload: string): boolean {
  const tokens = payload.split(" ").filter(Boolean);
  return tokens.slice(1).some((t) => /^[כל]/.test(t));
}

/**
 * Match the payload against the real item names. Tries the longest prefix of
 * the sentence first, so "יוסי כהן" wins over "יוסי" when both exist.
 */
export function resolveName(payload: string, boards: IntentBoard[]): NameResolution {
  const tokens = payload.split(" ").filter(Boolean);
  for (let k = tokens.length; k >= 1; k--) {
    const candidate = tokens.slice(0, k).join(" ");
    const nc = normalize(candidate);
    if (!nc) continue;
    const exact: NameMatch[] = [];
    const starts: NameMatch[] = [];
    const inside: NameMatch[] = [];
    for (const board of boards) {
      for (const item of board.items) {
        const ni = normalize(item.name);
        if (!ni) continue;
        if (ni === nc) exact.push({ item, board });
        else if (ni.startsWith(nc + " ")) starts.push({ item, board });
        else if (nc.length >= 2 && ni.includes(nc)) inside.push({ item, board });
      }
    }
    const hits = exact.length ? exact : starts.length ? starts : inside;
    if (hits.length) {
      return {
        kind: hits.length === 1 ? "one" : "many",
        matches: hits,
        matched: candidate,
        rest: tokens.slice(k).join(" "),
      };
    }
  }
  return { kind: "none", matches: [], matched: payload, rest: "" };
}

/**
 * The requested value, as a short list of readings to try against the column's
 * real labels. The Hebrew prefixes כ/ל glue onto the following word ("כסיים",
 * "לפעיל"), and a label may itself start with one of those letters — so both
 * readings are offered and the board decides which one exists.
 */
export function valueCandidates(rest: string): string[] {
  let s = (rest || "").trim().replace(/^[-–—:,]+\s*/, "");
  s = s.replace(VALUE_LEAD, "").trim();
  s = s.replace(/["'`״׳]/g, "").trim();
  if (!s) return [];
  const out = [s];
  if (s.length > 1 && /^[כל]/.test(s)) {
    out.push(s.replace(/^[כל][־\-\s]*/, "").trim());
  }
  return out.filter((v, i) => v.length > 0 && out.indexOf(v) === i);
}

/** Monday keeps a status column's allowed labels inside `settings_str`. */
export function parseStatusLabels(settingsStr: string | null | undefined): string[] {
  if (!settingsStr) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(settingsStr);
  } catch {
    return [];
  }
  const labels = (parsed as { labels?: unknown })?.labels;
  const out: string[] = [];
  const take = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (v && typeof v === "object") {
      const rec = v as { name?: unknown; label?: unknown };
      const t = typeof rec.name === "string" ? rec.name : typeof rec.label === "string" ? rec.label : "";
      if (t) out.push(t);
    }
  };
  if (Array.isArray(labels)) labels.forEach(take);
  else if (labels && typeof labels === "object") Object.values(labels as Record<string, unknown>).forEach(take);
  return out.map((s) => s.trim()).filter((s, i, a) => s.length > 0 && a.indexOf(s) === i);
}

/** First reading that exists on the column — returned in the board's own spelling. */
export function matchLabel(candidates: string[], labels: string[]): string | null {
  for (const c of candidates) {
    const nc = normalize(c);
    if (!nc) continue;
    const hit = labels.find((l) => normalize(l) === nc);
    if (hit) return hit;
  }
  return null;
}

/** The column's labels, for an answer that offers a choice instead of an error. */
export function labelsHtml(labels: string[]): string {
  return labels.map((l) => `<b>${escapeHtml(l)}</b>`).join(" · ");
}

/** The GraphQL used by both chat routes to read a board's label lists. */
export const STATUS_COLUMNS_QUERY = `query ($ids:[ID!]) {
  boards(ids:$ids) { id columns { id title type settings_str } }
}`;

export interface RawColumn { id: string; title: string; type: string; settings_str?: string | null }

/** Shape the response of STATUS_COLUMNS_QUERY into columnId → labels. */
export function labelsByColumn(data: unknown): Record<string, string[]> {
  const boards = (data as { boards?: { columns?: RawColumn[] }[] })?.boards || [];
  const map: Record<string, string[]> = {};
  for (const b of boards) {
    for (const c of b.columns || []) {
      const labels = parseStatusLabels(c.settings_str);
      if (labels.length) map[c.id] = labels;
    }
  }
  return map;
}
