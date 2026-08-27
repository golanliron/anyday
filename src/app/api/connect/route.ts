import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mondayQuery } from "@/lib/monday-server";

const COOKIE = "anyday_monday_token";

/**
 * Test-mode connect: the user pastes their personal Monday token in the UI.
 * We validate it against the real Monday API, then store it in an httpOnly
 * cookie so the browser never keeps it and every later request is authorized.
 * (Production path is OAuth; this is the fast lane for a single-operator test.)
 */
export async function POST(req: NextRequest) {
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
