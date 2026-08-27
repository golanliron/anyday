// Server-side Monday API access. The token is resolved from the logged-in
// user's org (via getMondayToken) — it is never accepted from the client.
import { cookies } from "next/headers";
import { getOrgContext, getMondayToken } from "./session";

const MONDAY_API = "https://api.monday.com/v2";

/**
 * Run a Monday GraphQL request.
 *
 * ALWAYS pass user-supplied data through `variables` rather than interpolating
 * it into the query string: a name/status/id containing a quote can otherwise
 * rewrite the query itself (and this token has write + delete rights).
 */
export async function mondayQuery(
  query: string,
  token: string,
  variables?: Record<string, unknown>
) {
  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "API-Version": "2024-01",
    },
    body: JSON.stringify(variables ? { query, variables } : { query }),
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
 * Is the single-operator personal-token shortcut allowed to run right now?
 *
 * That shortcut hands the SAME Monday account to every visitor, with no login
 * — fine on a laptop, catastrophic on a public URL. So it is enabled only in
 * development, unless the operator has deliberately opted in with
 * ANYDAY_ALLOW_PERSONAL_TOKEN=true (documented as single-tenant only).
 */
function personalTokenAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ANYDAY_ALLOW_PERSONAL_TOKEN === "true";
}

let warnedAboutPersonalToken = false;

/**
 * The gate every Monday-touching route calls first:
 *  - requires an authenticated user with an org (401),
 *  - requires that org to have a connected Monday token (409).
 * On success returns the decrypted token to use for this request only.
 */
export async function requireMonday(): Promise<MondayGuardResult> {
  // ── SINGLE-OPERATOR MODE (dev only, see personalTokenAllowed) ──
  // Lets one person experiment against their own real Monday account without
  // setting up Supabase auth + OAuth.
  const personal = process.env.MONDAY_PERSONAL_TOKEN;
  if (personal && personal.trim().length > 20) {
    if (personalTokenAllowed()) {
      return { ok: true, token: personal.trim(), orgId: "personal" };
    }
    if (!warnedAboutPersonalToken) {
      warnedAboutPersonalToken = true;
      console.warn(
        "[AnyDay] MONDAY_PERSONAL_TOKEN is set in production and was IGNORED. " +
          "It would give every anonymous visitor full read/write access to that " +
          "Monday account. Set ANYDAY_ALLOW_PERSONAL_TOKEN=true only for a " +
          "private single-tenant deployment."
      );
    }
    // fall through to the real, per-user paths below
  }

  // Cookie token set by the /welcome → /connect flow (each visitor pastes their
  // OWN token; it is httpOnly + sameSite so it stays scoped to that browser).
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
