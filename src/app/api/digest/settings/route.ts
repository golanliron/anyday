/**
 * /api/digest/settings — the organization's own digest preferences.
 *
 * The scheduled digest deliberately sends to nobody by default. Choosing boards
 * on the dashboard is not consent to receive email; turning this on is. This
 * route is where that consent is given and withdrawn.
 *
 * Everything here is scoped to the caller's own organization, resolved from
 * their session — an org id is never accepted from the client, so one tenant
 * cannot subscribe another to anything.
 *
 * GET  → the current settings, plus the outcome of the last scheduled run.
 * POST → { enabled?: boolean, recipients?: string[] }
 *        `recipients` empty means "the org's members", which is the default.
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/session";
import { createServiceClient, isSupabaseServerConfigured } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RECIPIENTS = 5;
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

const FIELDS =
  "digest_enabled, digest_board_ids, digest_recipients, digest_last_sent_at, digest_last_error, monday_token_encrypted";

/** Shape the row for the client — the token itself never leaves the server. */
function present(row: Record<string, unknown>) {
  return {
    enabled: Boolean(row.digest_enabled),
    boardIds: (row.digest_board_ids as string[]) ?? [],
    recipients: (row.digest_recipients as string[]) ?? [],
    lastSentAt: row.digest_last_sent_at ?? null,
    lastError: row.digest_last_error ?? null,
    mondayConnected: Boolean(row.monday_token_encrypted),
  };
}

export async function GET() {
  if (!isSupabaseServerConfigured())
    return NextResponse.json({ error: "Supabase לא מוגדר" }, { status: 503 });

  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "יש להתחבר כדי להמשיך" }, { status: 401 });

  const service = createServiceClient();
  if (!service) return NextResponse.json({ error: "אחסון לא זמין" }, { status: 503 });

  const { data, error } = await service
    .from("organizations")
    .select(FIELDS)
    .eq("id", ctx.orgId)
    .single();

  if (error || !data)
    return NextResponse.json({ error: error?.message ?? "לא נמצא" }, { status: 502 });

  return NextResponse.json({ orgName: ctx.orgName, ...present(data) });
}

export async function POST(req: NextRequest) {
  if (!isSupabaseServerConfigured())
    return NextResponse.json({ error: "Supabase לא מוגדר" }, { status: 503 });

  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: "יש להתחבר כדי להמשיך" }, { status: 401 });

  // הסכמה לקבל מייל בשם הארגון היא החלטת אדמין — לא של viewer. הקיר האמיתי
  // הוא ה-RLS (supabase-schema-v5.sql: עדכון organizations = אדמין בלבד);
  // הבדיקה כאן קיימת כדי שהסירוב יהיה 403 ברור ולא עדכון-שקט-שנכשל.
  if (ctx.role !== "admin")
    return NextResponse.json({ error: "רק אדמין יכול לשנות את הגדרות הדיגסט" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    enabled?: unknown;
    recipients?: unknown;
  };

  const patch: Record<string, unknown> = {};

  if (typeof body.enabled === "boolean") patch.digest_enabled = body.enabled;

  if (Array.isArray(body.recipients)) {
    // Validate here rather than at send time: a bad address saved today is a
    // silent failure next Sunday, when nobody is watching.
    const clean = body.recipients
      .map((r) => String(r).trim())
      .filter((r) => EMAIL_RE.test(r))
      .slice(0, MAX_RECIPIENTS);
    if (body.recipients.length && !clean.length)
      return NextResponse.json({ error: "אף כתובת מייל לא תקינה" }, { status: 400 });
    patch.digest_recipients = clean;
  }

  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "לא נשלח מה לעדכן" }, { status: 400 });

  const service = createServiceClient();
  if (!service) return NextResponse.json({ error: "אחסון לא זמין" }, { status: 503 });

  const { data, error } = await service
    .from("organizations")
    .update(patch)
    .eq("id", ctx.orgId)
    .select(FIELDS)
    .single();

  if (error || !data)
    return NextResponse.json({ error: error?.message ?? "העדכון נכשל" }, { status: 502 });

  return NextResponse.json({ ok: true, orgName: ctx.orgName, ...present(data) });
}
