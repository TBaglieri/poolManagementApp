-- =============================================================================
-- PoolOps Pro — Link staff_profiles to auth accounts
-- Run AFTER schema.sql (and auth-profile-trigger.sql). ADDITIVE + idempotent,
-- safe to paste into the Supabase SQL Editor and re-run.
--
-- ROOT CAUSE (see AUDIT.md §4e): the auth→staff link was never established. A
-- guard could sign in (auth.users + profiles row) but had no staff_profiles row
-- carrying their profile_id, so RLS's current_staff_id() (= the staff row where
-- profile_id = auth.uid()) resolved to NULL. My Shifts, clock-in-as-self and
-- per-person attribution therefore had no identity to hang on.
--
-- The link column already exists: staff_profiles.profile_id → profiles.id
-- (== auth.users.id). This migration makes it USABLE and UNAMBIGUOUS.
-- =============================================================================

-- 1) Email on the staff row: lets an invite RESERVE a staff profile before the
--    guard's auth account exists, and lets the backfill match by email in-tenant.
alter table public.staff_profiles add column if not exists email text;

-- 2) One auth account maps to at most ONE staff profile per tenant.
--    A plain unique index over (organization_id, profile_id): Postgres treats
--    NULLs as DISTINCT, so any number of RESERVED rows (profile_id NULL) may exist
--    per org, while every LINKED (org, auth-user) pair is unique. Created BEFORE
--    any upsert that uses it as an ON CONFLICT arbiter (avoids the 42P10 pitfall
--    we hit with partial indexes earlier).
drop index if exists idx_staff_org_profile;
create unique index idx_staff_org_profile
  on public.staff_profiles(organization_id, profile_id);

-- Fast lookups: "my" staff row, and reserved-row matching by (org, email).
create index if not exists idx_staff_profile on public.staff_profiles(profile_id);
create index if not exists idx_staff_org_email
  on public.staff_profiles(organization_id, lower(email));

-- 3) Scope current_staff_id() to the caller's CURRENT org, so a person who is a
--    member of more than one tenant resolves to the right staff row (never leaks
--    another tenant's staff identity). SECURITY DEFINER + fixed search_path.
create or replace function public.current_staff_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.staff_profiles
  where profile_id = auth.uid() and organization_id = public.current_org_id()
  limit 1;
$$;

-- Done. Invite-accept now writes profile_id at signup; scripts/link-staff-profiles
-- backfills any legacy accounts; current_staff_id() resolves them everywhere RLS
-- already keys self-service off it (shifts, trades, time-off, time-clock, …).
