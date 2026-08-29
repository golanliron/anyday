/**
 * /api/send-email — a thin wrapper: the gate, then the function.
 *
 * The sending itself now lives in `src/lib/send-email.ts` (moved verbatim), so
 * `/api/digest` can send without going through this route — and therefore
 * without having to get past this gate with no cookie in hand.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireMonday } from "@/lib/monday-server";
import { sendEmail } from "@/lib/send-email";

export async function POST(req: NextRequest) {
  // מי שמחוברת ל-Monday היא בדיוק מי שרשאית לשלוח. אותו שער בדיוק שכל נתיב
  // אחר עובר דרכו — לא מנגנון שני לתחזק. בלעדיו כל מי שיודע את הכתובת יכול
  // להציף מיילים על חשבון מפתח ה-Resend שלנו.
  const guard = await requireMonday();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const { to, subject, html, from } = await req.json();

    const result = await sendEmail({ to, subject, html, from });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

    return NextResponse.json({ success: true, id: result.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
