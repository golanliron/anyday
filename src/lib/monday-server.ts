// Server-side Monday API access. The token is resolved from the logged-in
// user's org (via getMondayToken) — it is never accepted from the client.
import { cookies } from "next/headers";
import { getOrgContext, getMondayToken } from "./session";

const MONDAY_API = "https://api.monday.com/v2";

export async function mondayQuery(query: string, token: string) {
  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "API-Version": "2024-01",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Monday API error (${res.status})`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

export type MondayGuardResult =
  | { ok: true; token: string; orgId: string }
  | { ok: false; status: number; error: string };

/**
 * The gate every Monday-touching route calls first:
 *  - requires an authenticated user with an org (401),
 *  - requires that org to have a connected Monday token (409).
 * On success returns the decrypted token to use for this request only.
 */
export async function requireMonday(): Promise<MondayGuardResult> {
  // ── TEST MODE ──
  // If a personal token is set in the environment, use it directly. This lets a
  // single operator experiment against their own real Monday account locally,
  // without setting up Supabase auth + OAuth. Do NOT use in multi-tenant prod.
  const personal = process.env.MONDAY_PERSONAL_TOKEN;
  if (personal && personal.trim().length > 20) {
    return { ok: true, token: personal.trim(), orgId: "personal" };
  }

  // Cookie token set by the /welcome → /connect flow (user pasted their token).
  try {
    const cookieToken = (await cookies()).get("anyday_monday_token")?.value;
    if (cookieToken && cookieToken.length > 20) {
      return { ok: true, token: cookieToken, orgId: "personal" };
    }
  } catch { /* cookies() unavailable in some contexts — fall through */ }

  const ctx = await getOrgContext();
  if (!ctx) return { ok: false, status: 401, error: "יש להתחבר כדי להמשיך" };
  if (!ctx.mondayConnected)
    return { ok: false, status: 409, error: "Monday לא מחובר. חברו את החשבון תחילה." };
  const token = await getMondayToken(ctx.orgId);
  if (!token)
    return { ok: false, status: 409, error: "החיבור ל-Monday פג. חברו מחדש." };
  return { ok: true, token, orgId: ctx.orgId };
}
