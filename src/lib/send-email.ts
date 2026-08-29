/**
 * src/lib/send-email.ts — the one place that hands an email to Resend.
 *
 * This logic used to live inside `POST /api/send-email`. It was MOVED here
 * unchanged (same provider, same key, same body, same errors, same statuses)
 * for one reason: `/api/send-email` is a public address that sends mail, so it
 * has to sit behind the login gate — but `/api/digest` used to reach it over
 * HTTP, server-to-server, with no cookie. The gate cannot tell that call apart
 * from an attacker's, so gating the route broke the digest (see reports/B6.md).
 *
 * Passing a cookie along on the internal call is NOT the fix: Vercel Cron calls
 * the digest with `Authorization: Bearer` and no cookie at all.
 *
 * So both sides now call this function directly and nothing goes over the
 * network in between. The route keeps guarding the outside world; the digest
 * never passes through it.
 *
 * The function does not throw: it reports failure the same way the route did,
 * as a status + message, so both callers can keep their existing behaviour.
 */

export interface SendEmailInput {
  to?: string | string[] | null;
  subject?: string | null;
  html?: string | null;
  from?: string | null;
}

export type SendEmailResult =
  | { ok: true; id?: string }
  | { ok: false; status: number; error: string };

export async function sendEmail({ to, subject, html, from }: SendEmailInput): Promise<SendEmailResult> {
  try {
    if (!to || !subject) {
      return { ok: false, status: 400, error: "missing to/subject" };
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return { ok: false, status: 500, error: "RESEND_API_KEY not configured" };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + resendKey,
      },
      body: JSON.stringify({
        from: from || "AnyDay <noreply@resend.dev>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || '<div dir="rtl" style="font-family:sans-serif">' + subject + "</div>",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, status: res.status, error: data.message || "email send failed" };
    }

    return { ok: true, id: data.id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "error";
    return { ok: false, status: 500, error: msg };
  }
}
