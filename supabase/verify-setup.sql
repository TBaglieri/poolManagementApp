-- =============================================================================
-- PoolOps Pro — SETUP VERIFICATION (read-only). Paste into the Supabase SQL Editor
-- and Run. Returns one row per check with ✓ OK / ✗ MISSING, grouped by the SQL file
-- that creates it. Changes NOTHING. Anything MISSING → run that file (all are
-- idempotent, safe to re-run).
-- =============================================================================
with checks(migration, check_name, ok) as (
  -- schema.sql — core tables
  select 'schema.sql', 'table: organizations',        to_regclass('public.organizations')        is not null union all
  select 'schema.sql', 'table: profiles',             to_regclass('public.profiles')             is not null union all
  select 'schema.sql', 'table: staff_profiles',       to_regclass('public.staff_profiles')       is not null union all
  select 'schema.sql', 'table: shift_reports',        to_regclass('public.shift_reports')        is not null union all
  select 'schema.sql', 'table: chemical_logs',        to_regclass('public.chemical_logs')        is not null union all
  select 'schema.sql', 'table: pay_periods',          to_regclass('public.pay_periods')          is not null union all

  -- seed.sql — reference data (roles must exist for memberships)
  select 'seed.sql', 'roles seeded (rows > 0)', (select count(*) from public.roles) > 0 union all

  -- rls-policies.sql — helper functions + a sample policy
  select 'rls-policies.sql', 'fn current_org_id()',   exists(select 1 from pg_proc where proname='current_org_id')   union all
  select 'rls-policies.sql', 'fn current_staff_id()', exists(select 1 from pg_proc where proname='current_staff_id') union all
  select 'rls-policies.sql', 'fn has_role()',         exists(select 1 from pg_proc where proname='has_role')         union all
  select 'rls-policies.sql', 'policy staff_select on staff_profiles',
         exists(select 1 from pg_policies where schemaname='public' and tablename='staff_profiles' and policyname='staff_select') union all

  -- auth-profile-trigger.sql — profile-on-signup
  select 'auth-profile-trigger.sql', 'fn handle_new_user()',
         exists(select 1 from pg_proc where proname='handle_new_user') union all
  select 'auth-profile-trigger.sql', 'trigger on_auth_user_created (auth.users)',
         exists(select 1 from pg_trigger where tgname='on_auth_user_created') union all

  -- tenant-config.sql — slug/config columns + Villas org
  select 'tenant-config.sql', 'organizations.slug column',
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='organizations' and column_name='slug') union all
  select 'tenant-config.sql', 'organizations.config column',
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='organizations' and column_name='config') union all
  select 'tenant-config.sql', 'Villas org row (slug=villas)',
         exists(select 1 from public.organizations where slug='villas') union all

  -- staff-auth-link.sql — email column + unique link index + org-scoped fn
  select 'staff-auth-link.sql', 'staff_profiles.email column',
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='staff_profiles' and column_name='email') union all
  select 'staff-auth-link.sql', 'unique index idx_staff_org_profile',
         exists(select 1 from pg_indexes where schemaname='public' and indexname='idx_staff_org_profile') union all

  -- chem-taken-at.sql — taken_at column
  select 'chem-taken-at.sql', 'chemical_logs.taken_at column',
         exists(select 1 from information_schema.columns where table_schema='public' and table_name='chemical_logs' and column_name='taken_at') union all

  -- shift-reports-rls.sql — self-scoped report policy
  select 'shift-reports-rls.sql', 'policy shiftreports_select',
         exists(select 1 from pg_policies where schemaname='public' and tablename='shift_reports' and policyname='shiftreports_select') union all
  select 'shift-reports-rls.sql', 'policy shiftreports_insert',
         exists(select 1 from pg_policies where schemaname='public' and tablename='shift_reports' and policyname='shiftreports_insert') union all

  -- rls-gaps.sql — payroll policies (were deny-all without these)
  select 'rls-gaps.sql', 'policy pay_periods_read',
         exists(select 1 from pg_policies where schemaname='public' and tablename='pay_periods' and policyname='pay_periods_read') union all
  select 'rls-gaps.sql', 'policy payroll_reviews_read',
         exists(select 1 from pg_policies where schemaname='public' and tablename='payroll_reviews' and policyname='payroll_reviews_read') union all
  select 'rls-gaps.sql', 'policy payroll_exports_read',
         exists(select 1 from pg_policies where schemaname='public' and tablename='payroll_exports' and policyname='payroll_exports_read')
)
select migration,
       check_name,
       case when ok then '✓ OK' else '✗ MISSING — run ' || migration end as status
from checks
order by ok asc, migration, check_name;
