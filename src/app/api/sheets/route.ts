import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

/**
 * POST /api/sheets — fetch a shared Google Sheet as CSV, for /sheet.
 *
 * Why a server route at all: Google's CSV export sends no CORS headers, so the
 * browser cannot read it directly. This route is a narrow pipe and nothing
 * more: the bytes go straight back to the tab that asked — nothing is stored,
 * logged or parsed here. Parsing happens in the browser, by the SAME reader a
 * dropped file gets (sheet-to-board), so there is exactly one place that
 * understands a spreadsheet.
 *
 * ── SSRF rule ──
 * The URL the user pasted is never fetched. It is only PARSED — for a
 * spreadsheet id (and optional gid) — and the fetch URL is rebuilt from a
 * fixed template on a fixed host. A pasted URL can choose WHICH public sheet
 * to read, and nothing else.
 */

const MAX_BYTES = 20 * 1024 * 1024; // the same cap the file path enforces

const SHARE_HINT =
  "ודאו שהגיליון משותף: שיתוף ← גישה כללית ← \"כל מי שיש לו הקישור\" (צופה מספיק).";

/** The two shapes of a Sheets link, each mapped to its own CSV endpoint. */
function csvUrlFor(raw: string): { url: string } | { bad: string } {
  let u: URL;
  try { u = new URL(raw); } catch { return { bad: "זה לא נראה כמו קישור. הדביקו את הכתובת המלאה מהדפדפן." }; }
  if (u.hostname !== "docs.google.com") {
    return { bad: "הקישור צריך להיות של Google Sheets (docs.google.com). פתחו את הגיליון והעתיקו את הכתובת מהדפדפן." };
  }
  // The tab id lives in the hash (#gid=), sometimes in the query.
  const gid = (u.hash.match(/gid=(\d+)/) || u.search.match(/gid=(\d+)/) || [])[1];
  const pub = u.pathname.match(/^\/spreadsheets\/d\/e\/([A-Za-z0-9_-]+)/);
  if (pub) return { url: `https://docs.google.com/spreadsheets/d/e/${pub[1]}/pub?output=csv${gid ? `&gid=${gid}` : ""}` };
  const doc = u.pathname.match(/^\/spreadsheets\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)/);
  if (doc) return { url: `https://docs.google.com/spreadsheets/d/${doc[1]}/export?format=csv${gid ? `&gid=${gid}` : ""}` };
  return { bad: "לא זיהיתי בקישור מזהה של גיליון. פתחו את הגיליון והעתיקו את הכתובת מהדפדפן." };
}

/** The sheet's own name, when Google says it (content-disposition filename). */
function titleFrom(res: Response): string | null {
  const cd = res.headers.get("content-disposition") || "";
  const star = cd.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) { try { const t = decodeURIComponent(star[1]).replace(/\.csv$/i, "").trim(); if (t) return t; } catch { /* fall back to the plain form */ } }
  const plain = cd.match(/filename="([^"]+)"/i);
  if (plain) { const t = plain[1].replace(/\.csv$/i, "").trim(); if (t) return t; }
  return null;
}

export async function POST(req: NextRequest) {
  // הנתיב ציבורי במכוון (מסלול /sheet עובד בלי חשבון), ולכן התקרה לפי IP:
  // בלעדיה הוא צינור חינמי להורדת CSV-ים מגוגל דרך השרת שלנו.
  const rl = rateLimit("sheets", clientIp(req), 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }

  const { url } = await req.json().catch(() => ({}));
  if (!url || typeof url !== "string" || url.length > 2000) {
    return NextResponse.json({ error: "חסר קישור לגיליון." }, { status: 400 });
  }
  const target = csvUrlFor(url.trim());
  if ("bad" in target) return NextResponse.json({ error: target.bad }, { status: 400 });

  let res: Response;
  try {
    res = await fetch(target.url, { redirect: "follow", signal: AbortSignal.timeout(15000), cache: "no-store" });
  } catch {
    return NextResponse.json({ error: "Google לא ענה בזמן. נסו שוב עוד רגע." }, { status: 502 });
  }

  // A private sheet does not FAIL — Google redirects to a login page and
  // answers 200. So the tell is the content type, not the status.
  const type = res.headers.get("content-type") || "";
  if (!res.ok || type.includes("text/html")) {
    return NextResponse.json({ error: `לא קיבלתי גישה לגיליון. ${SHARE_HINT}` }, { status: 400 });
  }
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared > MAX_BYTES) return NextResponse.json({ error: "הגיליון גדול מ-20MB." }, { status: 400 });
  const csv = await res.text();
  if (csv.length > MAX_BYTES) return NextResponse.json({ error: "הגיליון גדול מ-20MB." }, { status: 400 });
  if (csv.trim().startsWith("<")) {
    return NextResponse.json({ error: `לא קיבלתי גישה לגיליון. ${SHARE_HINT}` }, { status: 400 });
  }
  return NextResponse.json({ csv, title: titleFrom(res) });
}
