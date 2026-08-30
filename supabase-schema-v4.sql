-- AnyDay Database Schema v4 — what a scheduled digest needs to exist
-- Run this in your Supabase SQL Editor AFTER v3 (it is idempotent — safe to re-run).
--
-- Why this file exists
-- -------------------
-- v3 stored the Monday token per organization, which made us believe scheduling
-- was unblocked. It was not. A cron call has no browser: no session cookie, and
-- therefore no `getOrgContext()`. It was proven empirically — a call carrying a
-- valid DIGEST_SECRET and no cookie answered 401 "יש להתחבר כדי להמשיך".
--
-- Two things were missing, and both are here:
--
--   1. WHICH BOARDS. The dashboard kept the selection in the httpOnly cookie
--      `anyday_selected_boards`. A cron job cannot read a cookie that lives in
--      somebody's browser, so it had nothing to report on. The selection now
--      also lives on the org row.
--
--   2. WHETHER TO SEND AT ALL. Mailing an organization that never asked is not
--      a sane default, so `digest_enabled` starts false. Choosing boards is not
--      consent to be emailed; turning this on is.
--
-- Nothing here is per-customer. These are product columns, and they carry no
-- assumption about what any organization does.

alter table public.organizations
  add column if not exists digest_enabled      boolean     not null default false,
  add column if not exists digest_board_ids    text[]      not null default '{}',
  add column if not exists digest_recipients   text[]      not null default '{}',
  add column if not exists digest_last_sent_at timestamptz,
  add column if not exists digest_last_error   text;

comment on column public.organizations.digest_enabled is
  'Explicit opt-in for the scheduled digest. Cron skips every org where this is false.';
comment on column public.organizations.digest_board_ids is
  'Monday board ids the scheduled digest reports on. The browser keeps its own cookie; this is the copy a cron run can actually read.';
comment on column public.organizations.digest_recipients is
  'Explicit recipients. When empty, the digest falls back to the org members'' own login emails.';
comment on column public.organizations.digest_last_sent_at is
  'Set on a successful send, so a run can be inspected after the fact.';
comment on column public.organizations.digest_last_error is
  'Last failure text, or null. A digest that silently stops is worse than one that fails loudly.';

-- The cron run asks "which orgs are due?". Without this it scans every row.
create index if not exists idx_organizations_digest_due
  on public.organizations (digest_enabled)
  where digest_enabled and monday_token_encrypted is not null;

-- No new RLS policy is needed: these columns sit on `organizations`, which is
-- already covered by "org_members_all". Members read and write their own row;
-- the cron path uses the service key and never trusts client input for org id.
