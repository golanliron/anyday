/**
 * /api/digest — the weekly digest, by email.
 *
 * The promise of the product in its simplest form: the manager opens her inbox
 * on Sunday morning and already knows what needs attention. She does not open
 * anything.
 *
 * ── Where the content comes from ────────────────────────────────────────────
 * Nothing is computed here. Items are read through `fetchBoards()` (the one
 * paginated reader), and every number/name/label is produced by
 * `board-intelligence.ts` — `terminology`, `headlineKpis`, `attention`,
 * `breakdown`, `byOwner`, `numberSummary`. In particular, "needs attention" is
 * whatever the engine says it is: it derives the meaning of a status from the
 * HUE of the colour the board itself gave that label (`toneOf`/`statusTones`),
 * so this route contains no word comparison, no Hebrew status list, and no
 * assumption about what the organisation does. A construction company and a
 * youth charity get a correct email from the same code.
 *
 * ── Honesty about partial reads ─────────────────────────────────────────────
 * A board bigger than ANYDAY_MAX_ITEMS is read only in part. `coverage()` says
 * so, and the email prints "מבוסס על X מתוך Y רשומות" at the top and per board.
 * A percentage of a sample presented as a percentage of the whole is a lie, and
 * a lie in an email nobody double-checks is worse than a lie on a screen.
 *
 * ── Who may call it ─────────────────────────────────────────────────────────
 * This route SENDS MAIL, so a public address would be a flooding tool. Two
 * gates, both must pass:
 *   1. `requireMonday()` — same gate as every other Monday-touching route.
 *   2. A caller from outside the browser must present `DIGEST_SECRET` in a
 *      header (`x-digest-secret`, or `Authorization: Bearer <secret>`).
 *      Never in the query string — query strings land in server logs.
 *      A call that already carries this app's own session cookie is "inside"
 *      and does not need the secret.
 *
 * ── Scheduling ──────────────────────────────────────────────────────────────
 * Manual for now: call it and it sends. Wiring it to a schedule is one entry in
 * vercel.json — see the report; the code needs no change, because Vercel Cron
 * sends `Authorization: Bearer $CRON_SECRET`, which gate 2 already accepts.
 *
 * Params (query on GET, JSON body on POST):
 *   to=a@b.com[,c@d.com]  recipients      (default: DIGEST_TO)
 *   boards=123,456        board ids       (default: the anyday_selected_boards cookie)
 *   preview=1             build it and return it, send nothing
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";
import { requireMonday } from "@/lib/monday-server";
import { fetchBoards, parseBoardIds, coverage, type FetchedBoard } from "@/lib/board-fetch";
import { renderDigest, digestSection } from "@/lib/digest-email";
import { sendEmail } from "@/lib/send-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RECIPIENTS = 5;
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

/* ------------------------------------------------------------------- gate */

/** Constant-time compare that tolerates different lengths (hash first). */
function secretMatches(presented: string, configured: string): boolean {
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(configured).digest();
  return timingSafeEqual(a, b);
}

/** The secret is accepted from headers only — a query string is logged. */
function presentedSecret(req: NextRequest): string | null {
  const direct = req.headers.get("x-digest-secret");
  if (direct?.trim()) return direct.trim();
  const auth = req.headers.get("authorization") || "";
  if (/^bearer\s+/i.test(auth)) {
    const v = auth.replace(/^bearer\s+/i, "").trim();
    if (v) return v;
  }
  return null;
}

type Gate = { ok: true } | { ok: false; status: number; error: string };

async function authorizeDigest(req: NextRequest): Promise<Gate> {
  const configured = (process.env.DIGEST_SECRET || "").trim();
  const presented = presentedSecret(req);

  if (presented) {
    // Fail closed: an unset secret must not mean "everything is allowed".
    if (!configured)
      return { ok: false, status: 503, error: "DIGEST_SECRET לא הוגדר בשרת, ולכן קריאות חיצוניות חסומות" };
    if (!secretMatches(presented, configured))
      return { ok: false, status: 401, error: "סוד שגוי" };
    return { ok: true };
  }

  // No secret presented → this must be a call from a signed-in browser.
  try {
    const jar = await cookies();
    const inside = jar.getAll().some((c) => c.name === "anyday_monday_token" || c.name.startsWith("sb-"));
    if (inside) return { ok: true };
  } catch {
    /* cookies() unavailable → treat as an outside call */
  }
  return {
    ok: false,
    status: 401,
    error: "קריאה חיצונית חייבת לכלול את הכותרת x-digest-secret",
  };
}

/* ---------------------------------------------------------------- content */

interface Params { to: string[]; boards: string | null; preview: boolean }

function parseRecipients(raw: string | null | undefined): string[] {
  return (raw || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => EMAIL_RE.test(s))
    .slice(0, MAX_RECIPIENTS);
}

/* ------------------------------------------------------------------- send */

/**
 * Sending goes through `sendEmail()` from `@/lib/send-email` — the SAME code
 * `/api/send-email` runs, called DIRECTLY. Resend stays integrated in exactly
 * one place and there is one API key, not two.
 *
 * It used to be an HTTP call to `/api/send-email`. That is what stopped that
 * route from being closed to the public (reports/B6.md): a server-to-server
 * fetch carries no cookie, so the login gate could not tell the digest apart
 * from an attacker. Passing a cookie along was no answer either — Vercel Cron
 * calls this route with `Authorization: Bearer` and no cookie at all.
 *
 * Calling the function removes the network hop entirely: the gate now protects
 * the outside world, and the digest simply never passes through it. It also
 * makes `ANYDAY_BASE_URL` irrelevant on this path, and with it the risk in
 * reports/T8.md that Vercel's deployment protection blocks the internal call.
 */
async function sendDigest(to: string[], subject: string, html: string) {
  const from = (process.env.DIGEST_FROM || "").trim();

  const result = await sendEmail({ to, subject, html, from: from || undefined });
  if (!result.ok) throw new Error(result.error);
  return result.id || null;
}

/* ----------------------------------------------------------------- handler */

async function handle(req: NextRequest, params: Params) {
  const gate = await authorizeDigest(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const guard = await requireMonday();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const saved = (await cookies()).get("anyday_selected_boards")?.value;
  const ids = parseBoardIds(params.boards || saved);
  if (!ids.length)
    return NextResponse.json(
      { error: "לא נבחר בורד. הוסיפו ?boards=<id> או בחרו בורד בדשבורד." },
      { status: 400 }
    );

  const to = params.to.length ? params.to : parseRecipients(process.env.DIGEST_TO);
  if (!to.length && !params.preview)
    return NextResponse.json(
      { error: "אין נמען. הוסיפו ?to=<כתובת> או הגדירו DIGEST_TO." },
      { status: 400 }
    );

  let boards: FetchedBoard[];
  try {
    boards = await fetchBoards(ids, guard.token);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "שגיאה בקריאת הבורד" }, { status: 502 });
  }
  if (!boards.length)
    return NextResponse.json({ error: "הבורד לא נמצא או שאין הרשאה אליו" }, { status: 404 });

  const cov = coverage(boards);
  const digest = renderDigest({
    boards: boards.map(digestSection),
    coverage: cov,
    generatedAt: new Date(),
    sourceLabel: boards.map((b) => `"${b.name}"`).join(" · "),
  });

  if (params.preview) {
    return NextResponse.json({
      preview: true,
      to,
      subject: digest.subject,
      text: digest.text,
      html: digest.html,
      coverage: cov,
    });
  }

  try {
    const id = await sendDigest(to, digest.subject, digest.html);
    return NextResponse.json({ sent: true, id, to, subject: digest.subject, coverage: cov });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "שליחה נכשלה" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  return handle(req, {
    to: parseRecipients(q.get("to")),
    boards: q.get("boards"),
    preview: q.get("preview") === "1" || q.get("dry") === "1",
  });
}

export async function POST(req: NextRequest) {
  let body: { to?: string | string[]; boards?: string; preview?: boolean } = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }
  const q = req.nextUrl.searchParams;
  const to = Array.isArray(body.to) ? body.to.join(",") : body.to;
  return handle(req, {
    to: parseRecipients(to || q.get("to")),
    boards: body.boards || q.get("boards"),
    preview: body.preview === true || q.get("preview") === "1",
  });
}
