-- =============================================================================
-- PoolOps Pro — RLS gap fix: payroll tables had RLS ENABLED but NO policies
-- Run AFTER schema.sql + rls-policies.sql. ADDITIVE + idempotent, SQL-Editor safe.
--
-- pay_periods / payroll_reviews / payroll_exports are excluded from the generic
-- org policies (they're sensitive) but never got explicit policies — so RLS denied
-- them to EVERYONE, including admins. These scope them to payroll/admin roles.
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array['pay_periods','payroll_reviews','payroll_exports']
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I on public.%I;', t || '_read', t);
    execute format(
      'create policy %I on public.%I for select
       using (organization_id = public.current_org_id()
              and public.has_role(''super_admin'',''org_admin'',''payroll_team'',''ops_manager''));',
      t || '_read', t);

    execute format('drop policy if exists %I on public.%I;', t || '_manage', t);
    execute format(
      'create policy %I on public.%I for all
       using (organization_id = public.current_org_id()
              and public.has_role(''super_admin'',''org_admin'',''payroll_team''))
       with check (organization_id = public.current_org_id());',
      t || '_manage', t);
  end loop;
end$$;
