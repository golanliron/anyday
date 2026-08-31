import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mondayQuery, personalTokenAllowed } from "@/lib/monday-server";
import { rateLimit, clientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

const COOKIE = "anyday_monday_token";

/**
 * Test-mode connect: the user pastes their personal Monday token in the UI.
 * We validate it against the real Monday API, then store it in an httpOnly
 * cookie so the browser never keeps it and every later request is authorized.
 * (Production path is OAuth; this is the fast lane for a single-operator test.)
 *
 * Gated behind the SAME flag as MONDAY_PERSONAL_TOKEN: in a public deployment
 * this route was a token oracle — paste any stolen Monday token and the server
 * tells you whether it works and whose account it opens. DELETE stays open so
 * a stale cookie can always be cleared.
 */
export async function POST(req: NextRequest) {
  if (!personalTokenAllowed()) {
    return NextResponse.json(
      { error: "מסלול הדבקת-טוקן כבוי בפריסה. חברו את Monday דרך OAuth." },
      { status: 403 }
    );
  }

  // גם כשהמסלול מותר, הוא בודק טוקנים מול Monday — לא נותנים לסקריפט לנחש בהם.
  const rl = rateLimit("connect", clientIp(req), 5, 5 * 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }

  const { token } = await req.json().catch(() => ({ token: "" }));
  if (!token || typeof token !== "string" || token.trim().length < 20) {
    return NextResponse.json({ error: "הטוקן קצר מדי או חסר" }, { status: 400 });
  }

  // Validate against Monday: who am I?
  let account: string | null = null, userName: string | null = null;
  try {
    const data = await mondayQuery(`query { me { name account { name } } }`, token.trim());
    account = data?.me?.account?.name ?? null;
    userName = data?.me?.name ?? null;
  } catch {
    return NextResponse.json({ error: "הטוקן לא תקין או שפג תוקפו" }, { status: 401 });
  }

  const store = await cookies();
  store.set(COOKIE, token.trim(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // a week
  });

  return NextResponse.json({ ok: true, account, userName });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(COOKIE);
  return NextResponse.json({ ok: true });
}
