-- AnyDay Database Schema v5 — roles stop being decorative
-- Run this in your Supabase SQL Editor AFTER v3 and v4 (idempotent — safe to re-run).
--
-- Why this file exists
-- -------------------
-- v3 defined three roles (admin / member / viewer) and then never consulted
-- them: every table's policy was "for all" for ANY member of the org. v4 made
-- that worse in practice by adding digest_enabled / digest_recipients to the
-- organizations row under the same policy — so a `viewer` could subscribe the
-- whole org to email, change the recipients, or wipe the Monday connection,
-- straight through PostgREST with their own session, no server route involved.
-- (The finding was graded "dormant blocker": it detonates the day the invite
-- flow ships and the first real viewer exists.)
--
-- The shape after v5
-- ------------------
--   read       — any member of the org (unchanged)
--   write      — admin + member, never viewer      (blueprints, health data)
--   org row    — UPDATE is admin-only: the org row now carries the Monday
--                token state and the digest consent, and those are exactly
--                the settings a viewer must not touch
--   insert/delete of orgs and memberships — service role only (bypasses RLS),
--                as before; nobody self-inserts
--
-- App routes enforce the same rule with ctx.role so the failure is a Hebrew
-- 403 instead of a silent empty update — but THIS file is the actual wall:
-- the browser holds a real Supabase session and can talk to PostgREST
-- directly, so a check that lives only in a Next.js route is a suggestion.

-- ============================================================
-- 0. Role-aware helpers (same SECURITY DEFINER pattern as
--    current_user_org_ids — avoids RLS recursion on org_users)
-- ============================================================

create or replace function public.current_user_admin_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select org_id from public.org_users
  where user_id = auth.uid() and role = 'admin';
$$;

create or replace function public.current_user_writer_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select org_id from public.org_users
  where user_id = auth.uid() and role in ('admin', 'member');
$$;

-- ============================================================
-- 1. Organizations: members read, ONLY admins update
-- ============================================================

drop policy if exists "org_members_all" on public.organizations;

drop policy if exists "org_members_select" on public.organizations;
create policy "org_members_select" on public.organizations
  for select
  using (id in (select public.current_user_org_ids()));

drop policy if exists "org_admins_update" on public.organizations;
create policy "org_admins_update" on public.organizations
  for update
  using (id in (select public.current_user_admin_org_ids()))
  with check (id in (select public.current_user_admin_org_ids()));

-- No insert/delete policy on purpose: creating and removing organizations is
-- the bootstrap's job, done with the service key.

-- ============================================================
-- 2. Blueprints: members read, writers (admin+member) write
-- ============================================================

drop policy if exists "blueprints_all" on public.blueprints;

drop policy if exists "blueprints_select" on public.blueprints;
create policy "blueprints_select" on public.blueprints
  for select
  using (org_id in (select public.current_user_org_ids()));

drop policy if exists "blueprints_write" on public.blueprints;
create policy "blueprints_write" on public.blueprints
  for insert
  with check (org_id in (select public.current_user_writer_org_ids()));

drop policy if exists "blueprints_update" on public.blueprints;
create policy "blueprints_update" on public.blueprints
  for update
  using (org_id in (select public.current_user_writer_org_ids()))
  with check (org_id in (select public.current_user_writer_org_ids()));

drop policy if exists "blueprints_delete" on public.blueprints;
create policy "blueprints_delete" on public.blueprints
  for delete
  using (org_id in (select public.current_user_writer_org_ids()));

-- ============================================================
-- 3. Health checks + findings: members read, writers write
-- ============================================================

drop policy if exists "health_checks_all" on public.health_checks;

drop policy if exists "health_checks_select" on public.health_checks;
create policy "health_checks_select" on public.health_checks
  for select
  using (org_id in (select public.current_user_org_ids()));

drop policy if exists "health_checks_write" on public.health_checks;
create policy "health_checks_write" on public.health_checks
  for insert
  with check (org_id in (select public.current_user_writer_org_ids()));

drop policy if exists "health_checks_delete" on public.health_checks;
create policy "health_checks_delete" on public.health_checks
  for delete
  using (org_id in (select public.current_user_writer_org_ids()));

drop policy if exists "health_findings_all" on public.health_findings;

drop policy if exists "health_findings_select" on public.health_findings;
create policy "health_findings_select" on public.health_findings
  for select
  using (
    health_check_id in (
      select id from public.health_checks
      where org_id in (select public.current_user_org_ids())
    )
  );

drop policy if exists "health_findings_write" on public.health_findings;
create policy "health_findings_write" on public.health_findings
  for insert
  with check (
    health_check_id in (
      select id from public.health_checks
      where org_id in (select public.current_user_writer_org_ids())
    )
  );

drop policy if exists "health_findings_delete" on public.health_findings;
create policy "health_findings_delete" on public.health_findings
  for delete
  using (
    health_check_id in (
      select id from public.health_checks
      where org_id in (select public.current_user_writer_org_ids())
    )
  );
