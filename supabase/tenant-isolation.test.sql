-- =============================================================================
-- PoolOps Pro — LIVE cross-tenant isolation test
-- Run in the Supabase SQL editor AFTER schema.sql + rls-policies.sql.
--
-- It creates two throwaway organizations, two users (one per org), a chemical_log
-- row in each, then impersonates user A (via the JWT claim that auth.uid() reads)
-- and asserts A can see ONLY org A's row — a cross-tenant read of org B fails.
-- Everything runs inside a transaction and is ROLLED BACK, so no data is left.
--
-- Note: inserting into auth.users is version-sensitive; if your instance rejects
-- the columns below, adjust them. This is the standard RLS-testing pattern
-- (set request.jwt.claims + role authenticated, then query as that user).
-- =============================================================================

begin;

do $$
declare
  org_a uuid := gen_random_uuid();
  org_b uuid := gen_random_uuid();
  usr_a uuid := gen_random_uuid();
  usr_b uuid := gen_random_uuid();
  fac_a uuid := gen_random_uuid();
  fac_b uuid := gen_random_uuid();
  staff_a uuid := gen_random_uuid();
  staff_b uuid := gen_random_uuid();
  visible_a int;
  visible_b int;
  my_staff uuid;
begin
  -- Order matters (FKs): organizations before profiles.organization_id.
  insert into public.organizations (id, name, type)
  values (org_a, 'Isolation Org A', 'community_pool'), (org_b, 'Isolation Org B', 'community_pool');

  -- Auth users (minimal). Adjust columns if your instance requires more.
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', usr_a, 'authenticated', 'authenticated', 'a@isolation.test', '', now(), now()),
         ('00000000-0000-0000-0000-000000000000', usr_b, 'authenticated', 'authenticated', 'b@isolation.test', '', now(), now());

  -- auth-profile-trigger.sql (if installed) already created these profiles rows on
  -- the insert above, so UPSERT to set the org rather than plain-insert.
  insert into public.profiles (id, organization_id, email)
  values (usr_a, org_a, 'a@isolation.test'), (usr_b, org_b, 'b@isolation.test')
  on conflict (id) do update set organization_id = excluded.organization_id, email = excluded.email;

  insert into public.organization_members (organization_id, profile_id, role_slug, status)
  values (org_a, usr_a, 'org_admin', 'active'), (org_b, usr_b, 'org_admin', 'active');

  insert into public.facilities (id, organization_id, name) values (fac_a, org_a, 'A Pool'), (fac_b, org_b, 'B Pool');
  insert into public.chemical_logs (organization_id, facility_id, ph) values (org_a, fac_a, 7.4), (org_b, fac_b, 7.5);

  -- Staff rows LINKED to each user (the auth→staff link this migration adds).
  insert into public.staff_profiles (id, organization_id, profile_id, first_name, primary_role)
  values (staff_a, org_a, usr_a, 'A', 'org_admin'), (staff_b, org_b, usr_b, 'B', 'org_admin');

  -- Impersonate user A (authenticated).
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', usr_a, 'role', 'authenticated')::text, true);

  select count(*) into visible_a from public.chemical_logs where organization_id = org_a;
  select count(*) into visible_b from public.chemical_logs where organization_id = org_b;
  -- current_staff_id() must resolve to A's OWN staff row, never B's.
  select public.current_staff_id() into my_staff;

  -- Back to the privileged role to raise/inspect.
  perform set_config('role', 'postgres', true);

  if visible_a <> 1 then
    raise exception 'ISOLATION TEST FAILED: user A should see their own org A row (saw %).', visible_a;
  end if;
  if visible_b <> 0 then
    raise exception 'ISOLATION TEST FAILED: CROSS-TENANT LEAK — user A saw % row(s) from org B.', visible_b;
  end if;
  if my_staff <> staff_a then
    raise exception 'STAFF-LINK TEST FAILED: current_staff_id() resolved to % (expected A''s row %).', my_staff, staff_a;
  end if;

  raise notice 'ISOLATION TEST PASSED: user A saw org A (%), 0 org B rows, and resolved to their own staff row.', visible_a;
end$$;

rollback;
