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
 *   2. A caller from outside the browser must present `CRON_SECRET` (what
 *      Vercel Cron sends) or `DIGEST_SECRET` (a hand-made call) in a header
 *      (`x-digest-secret`, or `Authorization: Bearer <secret>`).
 *      Never in the query string — query strings land in server logs.
 *      A call that already carries this app's own session cookie is "inside"
 *      and does not need the secret.
 *
 * ── Two callers, two different paths ────────────────────────────────────────
 * FROM A BROWSER: the session identifies one org. Boards come from the
 * `anyday_selected_boards` cookie, recipients from DIGEST_TO. Unchanged.
 *
 * FROM A SCHEDULE (secret, no cookie): `runScheduled()`. There is no session to
 * resolve an org from, so it reads the opted-in orgs out of the database and
 * runs each on its own token, boards and recipients.
 *
 * That second path did not exist before, and its absence was invisible: the
 * secret gate passed, and the request then died inside `requireMonday()` with
 * "יש להתחבר כדי להמשיך". Storing the token was necessary but not sufficient —
 * something still had to read it ON BEHALF OF a named org, and nothing did.
 * Board choice had the same hole: it lived only in a browser cookie.
 * See supabase-schema-v4.sql and /api/digest/settings.
 *
 * Params (query on GET, JSON body on POST):
 *   to=a@b.com[,c@d.com]  recipients      (default: DIGEST_TO) — browser path
 *   boards=123,456        board ids       (default: the cookie) — browser path
 *   preview=1 / dry=1     on the schedule: report what WOULD be sent, send none
 *   preview=1             build it and return the parts as JSON, send nothing
 *   preview=html          build it and return the EMAIL ITSELF, send nothing
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";
import { requireMonday } from "@/lib/monday-server";
import { fetchBoards, parseBoardIds, coverage, type FetchedBoard } from "@/lib/board-fetch";
import { renderDigest, digestSection } from "@/lib/digest-email";
import { sendEmail } from "@/lib/send-email";
import { getDigestTargets, recordDigestRun } from "@/lib/session";

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

/**
 * The secrets this route accepts. Either one alone is enough.
 *
 * `CRON_SECRET` is listed because it is the name the PLATFORM sends, not one
 * this file chose: a `crons` entry in vercel.json is invoked as
 * `Authorization: Bearer $CRON_SECRET`. This route used to compare against
 * `DIGEST_SECRET` only, so a correctly configured deployment answered 401 every
 * Sunday morning and told nobody — the schedule looked wired and sent no mail.
 * A digest that silently stops is the exact failure this feature exists to end.
 *
 * `DIGEST_SECRET` stays accepted so a hand-made call — curl, a preview run —
 * keeps working with the name it has always had.
 *
 * They do NOT have to hold the same value, and that is the point: requiring
 * them to match is a rule someone has to remember, and the two would drift.
 */
function configuredSecrets(): string[] {
  return [process.env.CRON_SECRET, process.env.DIGEST_SECRET]
    .map((s) => (s || "").trim())
    .filter((s) => s.length > 0);
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

type Gate =
  | { ok: true; viaSecret: boolean; hasSession: boolean }
  | { ok: false; status: number; error: string };

/** Does this request carry a browser session at all? */
async function hasBrowserSession(): Promise<boolean> {
  try {
    const jar = await cookies();
    return jar.getAll().some((c) => c.name === "anyday_monday_token" || c.name.startsWith("sb-"));
  } catch {
    return false;
  }
}

async function authorizeDigest(req: NextRequest): Promise<Gate> {
  const configured = configuredSecrets();
  const presented = presentedSecret(req);
  const session = await hasBrowserSession();

  if (presented) {
    // Fail closed: an unset secret must not mean "everything is allowed".
    if (configured.length === 0)
      return { ok: false, status: 503, error: "CRON_SECRET / DIGEST_SECRET לא הוגדרו בשרת, ולכן קריאות חיצוניות חסומות" };
    if (!configured.some((c) => secretMatches(presented, c)))
      return { ok: false, status: 401, error: "סוד שגוי" };
    return { ok: true, viaSecret: true, hasSession: session };
  }

  // No secret presented → this must be a call from a signed-in browser.
  if (session) return { ok: true, viaSecret: false, hasSession: true };

  return {
    ok: false,
    status: 401,
    error: "קריאה חיצונית חייבת לכלול את הכותרת x-digest-secret",
  };
}

/* ---------------------------------------------------------------- content */

interface Params { to: string[]; boards: string | null; preview: boolean; previewHtml?: boolean }

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

/**
 * The scheduled run — the path a cron job takes, and the one that did not
 * exist until now.
 *
 * A browser call resolves ONE org from the session cookie. A cron call has no
 * cookie, so it goes the other way: it asks the database which organizations
 * opted in, and handles each on its own token and its own boards. That is why
 * `requireMonday()` is not used here — there is no user to be.
 *
 * One organization failing must not stop the rest, so every org is wrapped and
 * its outcome recorded on its own row. The answer always names what was
 * skipped and why: a scheduled job that quietly does nothing is the worst
 * possible failure, because nobody finds out for a week.
 */
async function runScheduled(params: Params) {
  const { targets, skipped } = await getDigestTargets();

  const sent: { org: string; to: string[]; subject: string; id: string | null }[] = [];
  const failed: { org: string; error: string }[] = [];

  for (const t of targets) {
    try {
      const boards = await fetchBoards(t.boardIds, t.token);
      if (!boards.length) {
        const why = "הבורדים שנבחרו לא נמצאו או שאין אליהם הרשאה";
        failed.push({ org: t.orgName, error: why });
        await recordDigestRun(t.orgId, why);
        continue;
      }

      const cov = coverage(boards);
      const digest = renderDigest({
        boards: boards.map(digestSection),
        coverage: cov,
        generatedAt: new Date(),
        sourceLabel: boards.map((b) => `"${b.name}"`).join(" · "),
      });

      // A dry run reports exactly what it WOULD do, and sends nothing. This is
      // how you inspect a schedule without mailing real people to find out.
      if (params.preview || params.previewHtml) {
        sent.push({ org: t.orgName, to: t.recipients, subject: digest.subject, id: null });
        continue;
      }

      const id = await sendDigest(t.recipients, digest.subject, digest.html);
      sent.push({ org: t.orgName, to: t.recipients, subject: digest.subject, id });
      await recordDigestRun(t.orgId, null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "שגיאה";
      failed.push({ org: t.orgName, error: msg });
      await recordDigestRun(t.orgId, msg);
    }
  }

  return NextResponse.json({
    scheduled: true,
    dryRun: params.preview || params.previewHtml || false,
    organizations: targets.length + skipped.length,
    sent,
    failed,
    skipped,
  });
}

async function handle(req: NextRequest, params: Params) {
  const gate = await authorizeDigest(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  // Authorised by the secret, with no browser behind it → this is the schedule.
  if (gate.viaSecret && !gate.hasSession) return runScheduled(params);

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
  if (!to.length && !params.preview && !params.previewHtml)
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

  // `preview=html` renders the email itself, so a person can JUDGE it. The
  // JSON form below stays as it was for anything reading the parts.
  if (params.previewHtml) {
    return new NextResponse(digest.html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

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
    previewHtml: q.get("preview") === "html",
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
