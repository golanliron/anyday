/**
 * src/lib/send-email.ts — the one place that hands an email to Resend.
 *
 * This is a LIBRARY on purpose, not an HTTP route. There used to be a public
 * `POST /api/send-email`; its only real caller was the digest, and its gate
 * (`requireMonday`) accepted any cookie longer than 20 characters without ever
 * using the token — so in practice it was an open mail relay: a forged cookie
 * sent real mail, to any recipient, from any sender, on our Resend key. The
 * route was REMOVED. Mail can now be produced only by server code that decides
 * the recipients itself (the digest); there is no address on the network that
 * accepts to/from/html from a browser.
 *
 * If a future feature needs user-triggered mail, it must build the recipient
 * list and the body on the server from the caller's own session — never accept
 * them from the request.
 *
 * The function does not throw: it reports failure as a status + message, so
 * callers keep their existing behaviour.
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
