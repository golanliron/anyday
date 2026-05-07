-- AnyDay Database Schema v2 - Organizations & Health Checks
-- DO NOT run automatically. Review and run manually in Supabase SQL Editor.
-- This extends supabase-schema.sql (v1).

-- ============================================================
-- Organizations (multi-tenant foundation)
-- ============================================================

create table if not exists public.organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  plan text default 'free' check (plan in ('free', 'trial', 'starter', 'pro', 'enterprise')),
  monday_account_id text,
  monday_token_encrypted text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.organizations enable row level security;

create index if not exists idx_organizations_slug on public.organizations(slug);

-- ============================================================
-- Org Users (who belongs to which org)
-- ============================================================

create table if not exists public.org_users (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text default 'member' check (role in ('admin', 'member', 'viewer')),
  invited_at timestamptz default now(),
  unique(org_id, user_id)
);

alter table public.org_users enable row level security;

create index if not exists idx_org_users_user on public.org_users(user_id);
create index if not exists idx_org_users_org on public.org_users(org_id);

-- ============================================================
-- Health Checks (scan results)
-- ============================================================

create table if not exists public.health_checks (
  id uuid default gen_random_uuid() primary key,
  org_id uuid references public.organizations(id) on delete cascade,
  monday_account_id text,
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

-- ============================================================
-- Health Findings (individual issues found)
-- ============================================================

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
create index if not exists idx_health_findings_severity on public.health_findings(severity);

-- ============================================================
-- RLS Policies (users see only their org's data)
-- ============================================================

-- Organizations: members can read their org
create policy "org_members_select" on public.organizations
  for select using (
    id in (select org_id from public.org_users where user_id = auth.uid())
  );

-- Org Users: members can see co-members
create policy "org_users_select" on public.org_users
  for select using (
    org_id in (select org_id from public.org_users where user_id = auth.uid())
  );

-- Health Checks: org members can read
create policy "health_checks_select" on public.health_checks
  for select using (
    org_id in (select org_id from public.org_users where user_id = auth.uid())
  );

-- Health Findings: via health check's org
create policy "health_findings_select" on public.health_findings
  for select using (
    health_check_id in (
      select hc.id from public.health_checks hc
      join public.org_users ou on ou.org_id = hc.org_id
      where ou.user_id = auth.uid()
    )
  );

-- ============================================================
-- Triggers
-- ============================================================

create trigger on_organizations_updated
  before update on public.organizations
  for each row execute function handle_updated_at();
