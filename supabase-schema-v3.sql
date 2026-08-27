-- AnyDay Database Schema v3 — Consolidated Multi-Tenant Foundation
-- Run this ONCE in your Supabase SQL Editor (it is idempotent — safe to re-run).
--
-- This is the single source of truth. It supersedes v1 (public.users) and v2.
-- Identity comes from Supabase Auth (auth.users). Every row of business data is
-- scoped to an organization, and RLS enforces that a user only ever touches
-- data belonging to an org they are a member of.
--
-- Design goal: many organizations, each with its own boards, columns, and
-- beneficiaries — no shared schema between tenants, full isolation at the DB.

-- ============================================================
-- 0. Shared helpers
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 1. Organizations  (the tenant)
-- ============================================================

create table if not exists public.organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  plan text default 'trial' check (plan in ('trial', 'starter', 'team', 'org', 'network')),

  -- Monday connection (OAuth). Token is AES-256-GCM encrypted app-side before
  -- it ever reaches this column. It is NEVER sent back to the browser.
  monday_account_id text,
  monday_account_name text,
  monday_token_encrypted text,
  monday_connected_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.organizations enable row level security;
create index if not exists idx_organizations_slug on public.organizations(slug);

drop trigger if exists on_organizations_updated on public.organizations;
create trigger on_organizations_updated
  before update on public.organizations
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 2. Org membership  (who belongs to which tenant)
-- ============================================================

create table if not exists public.org_users (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text default 'admin' check (role in ('admin', 'member', 'viewer')),
  created_at timestamptz default now(),
  unique(org_id, user_id)
);

alter table public.org_users enable row level security;
create index if not exists idx_org_users_user on public.org_users(user_id);
create index if not exists idx_org_users_org on public.org_users(org_id);

-- Helper: the set of org_ids the current auth user belongs to.
-- SECURITY DEFINER so it can read org_users without tripping RLS recursion.
create or replace function public.current_user_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select org_id from public.org_users where user_id = auth.uid();
$$;

-- ============================================================
-- 3. Saved blueprints  (the AI-generated system designs, per org)
--    Structure is a free-form JSON blueprint — no fixed columns/beneficiary
--    schema. This is what lets every org model whatever it wants.
-- ============================================================

create table if not exists public.blueprints (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references public.organizations(id) on delete cascade not null,
  created_by uuid references auth.users(id) on delete set null,

  system_name text not null,
  description text,
  status text default 'draft' check (status in ('draft', 'built', 'archived')),

  -- The full blueprint payload the smart-builder produced (boards, columns,
  -- groups, automations, items). Kept as JSONB so it stays fully dynamic.
  payload jsonb not null default '{}'::jsonb,

  -- After it is built into Monday, we record what got created.
  built_result jsonb,
  built_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.blueprints enable row level security;
create index if not exists idx_blueprints_org on public.blueprints(org_id);
create index if not exists idx_blueprints_created on public.blueprints(created_at desc);

drop trigger if exists on_blueprints_updated on public.blueprints;
create trigger on_blueprints_updated
  before update on public.blueprints
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 4. Health checks + findings  (scan results, per org)
-- ============================================================

create table if not exists public.health_checks (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references public.organizations(id) on delete cascade not null,
  score integer not null check (score >= 0 and score <= 100),
  boards_scanned integer default 0,
  total_items integer default 0,
  summary_critical integer default 0,
  summary_warning integer default 0,
  summary_info integer default 0,
  scanned_at timestamptz default now()
);

alter table public.health_checks enable row level security;
create index if not exists idx_health_checks_org on public.health_checks(org_id);
create index if not exists idx_health_checks_scanned on public.health_checks(scanned_at desc);

create table if not exists public.health_findings (
  id uuid default gen_random_uuid() primary key,
  health_check_id uuid references public.health_checks(id) on delete cascade not null,
  category text not null check (category in ('structure', 'data', 'workflow', 'permissions')),
  severity text not null check (severity in ('critical', 'warning', 'info')),
  title text not null,
  description text not null,
  board_id text,
  board_name text,
  affected_items integer default 0,
  suggestion text not null
);

alter table public.health_findings enable row level security;
create index if not exists idx_health_findings_check on public.health_findings(health_check_id);

-- ============================================================
-- 5. Row Level Security policies
--    Every policy funnels through current_user_org_ids(): you only see and
--    touch rows for orgs you are a member of.
-- ============================================================

-- Organizations ------------------------------------------------
drop policy if exists "org_members_all" on public.organizations;
create policy "org_members_all" on public.organizations
  for all
  using (id in (select public.current_user_org_ids()))
  with check (id in (select public.current_user_org_ids()));

-- Org users ----------------------------------------------------
drop policy if exists "org_users_select" on public.org_users;
create policy "org_users_select" on public.org_users
  for select
  using (org_id in (select public.current_user_org_ids()));

-- Note: INSERT of the very first membership (bootstrap) is done with the
-- service-role key server-side, which bypasses RLS. Members never self-insert.

-- Blueprints ---------------------------------------------------
drop policy if exists "blueprints_all" on public.blueprints;
create policy "blueprints_all" on public.blueprints
  for all
  using (org_id in (select public.current_user_org_ids()))
  with check (org_id in (select public.current_user_org_ids()));

-- Health checks ------------------------------------------------
drop policy if exists "health_checks_all" on public.health_checks;
create policy "health_checks_all" on public.health_checks
  for all
  using (org_id in (select public.current_user_org_ids()))
  with check (org_id in (select public.current_user_org_ids()));

-- Health findings (scoped via parent check's org) --------------
drop policy if exists "health_findings_all" on public.health_findings;
create policy "health_findings_all" on public.health_findings
  for all
  using (
    health_check_id in (
      select id from public.health_checks
      where org_id in (select public.current_user_org_ids())
    )
  )
  with check (
    health_check_id in (
      select id from public.health_checks
      where org_id in (select public.current_user_org_ids())
    )
  );
