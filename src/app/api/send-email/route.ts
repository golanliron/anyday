import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, from } = await req.json();

    if (!to || !subject) {
      return NextResponse.json({ error: "missing to/subject" }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
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
      return NextResponse.json({ error: data.message || "email send failed" }, { status: res.status });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
