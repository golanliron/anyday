// Server-only module: relies on next/headers cookies via createServerSupabase.
import { createServerSupabase, createServiceClient } from "./supabase-server";
import { decrypt } from "./encryption";

export interface OrgContext {
  userId: string;
  email: string | null;
  orgId: string;
  orgName: string;
  role: string;
  mondayConnected: boolean;
  mondayAccountName: string | null;
}

/**
 * The org slug is derived from the user id and nothing else, so it is the SAME
 * on every concurrent first request. That is what makes the bootstrap below
 * safe: two parallel requests produce the same slug, the unique index on
 * organizations.slug lets only one row exist, and the loser simply reads it.
 *
 * A time-based slug used to be generated here, which made every racing request
 * unique — and produced two orgs for one user, 121ms apart, on the very first
 * real login.
 */
function orgSlugFor(userId: string): string {
  return `org-${userId}`;
}

/**
 * Resolve the logged-in user and the organization they belong to.
 * On a user's very first authenticated call, this auto-creates an organization
 * and an admin membership for them (the "bootstrap") using the service-role
 * client, so the multi-tenant model is populated without any manual step.
 *
 * Returns null if there is no authenticated user (caller should 401) or if
 * Supabase is not configured (caller should surface a setup message).
 */
export async function getOrgContext(): Promise<OrgContext | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Find an existing membership (RLS: user sees only their own).
  const { data: membership } = await supabase
    .from("org_users")
    .select("org_id, role, organizations(name, monday_token_encrypted, monday_account_name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership) {
    const org = membership.organizations as unknown as {
      name: string;
      monday_token_encrypted: string | null;
      monday_account_name: string | null;
    };
    return {
      userId: user.id,
      email: user.email ?? null,
      orgId: membership.org_id as string,
      orgName: org?.name ?? "הארגון שלי",
      role: (membership.role as string) ?? "admin",
      mondayConnected: Boolean(org?.monday_token_encrypted),
      mondayAccountName: org?.monday_account_name ?? null,
    };
  }

  // No org yet → bootstrap one with the service client (bypasses RLS).
  const service = createServiceClient();
  if (!service) return null;

  const baseName =
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "הארגון שלי";
  const orgName = `${baseName} — AnyDay`;

  const slug = orgSlugFor(user.id);

  // Insert only if this user has no org yet. If a parallel request beat us to
  // it, the unique index on slug swallows this write instead of creating a
  // second org — the whole point of the deterministic slug above.
  const { error: orgErr } = await service
    .from("organizations")
    .upsert({ name: orgName, slug, plan: "trial" }, { onConflict: "slug", ignoreDuplicates: true });
  if (orgErr) {
    console.error("Org bootstrap failed:", orgErr.message);
    return null;
  }

  // Read back whichever row exists now — ours, or the one the race winner made.
  const { data: org, error: readErr } = await service
    .from("organizations")
    .select("id, name")
    .eq("slug", slug)
    .single();
  if (readErr || !org) {
    console.error("Org bootstrap read-back failed:", readErr?.message);
    return null;
  }

  // Same reasoning: unique(org_id, user_id) makes the second write a no-op.
  const { error: memErr } = await service.from("org_users").upsert(
    { org_id: org.id, user_id: user.id, role: "admin" },
    { onConflict: "org_id,user_id", ignoreDuplicates: true }
  );
  if (memErr) {
    console.error("Membership bootstrap failed:", memErr.message);
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    orgId: org.id as string,
    orgName: org.name as string,
    role: "admin",
    mondayConnected: false,
    mondayAccountName: null,
  };
}

/**
 * Fetch and decrypt the Monday token for the current user's org.
 * Uses the service client to read the encrypted column AFTER getOrgContext has
 * already proven the user belongs to that org. Never returns the token to any
 * client — callers use it only to talk to Monday server-side.
 */
export async function getMondayToken(orgId: string): Promise<string | null> {
  const service = createServiceClient();
  if (!service) return null;
  const { data, error } = await service
    .from("organizations")
    .select("monday_token_encrypted")
    .eq("id", orgId)
    .single();
  if (error || !data?.monday_token_encrypted) return null;
  try {
    return decrypt(data.monday_token_encrypted as string);
  } catch (e) {
    console.error("Monday token decrypt failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
