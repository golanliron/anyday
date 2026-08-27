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

function slugify(base: string): string {
  const clean = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  // suffix keeps slugs unique without needing Math.random (unavailable here)
  return `${clean || "org"}-${Date.now().toString(36)}`;
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

  const { data: org, error: orgErr } = await service
    .from("organizations")
    .insert({ name: orgName, slug: slugify(baseName), plan: "trial" })
    .select("id, name")
    .single();
  if (orgErr || !org) {
    console.error("Org bootstrap failed:", orgErr?.message);
    return null;
  }

  const { error: memErr } = await service.from("org_users").insert({
    org_id: org.id,
    user_id: user.id,
    role: "admin",
  });
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
