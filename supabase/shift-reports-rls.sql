-- =============================================================================
-- PoolOps Pro — Shift reports: server-side visibility scoping by role
-- Run AFTER schema.sql + rls-policies.sql. ADDITIVE + idempotent, SQL-Editor safe.
--
-- A LIFEGUARD may see and edit ONLY their OWN shift reports; managers/admins see all
-- for the tenant. Enforced here (RLS) — not just in the UI — so a guard can't fetch
-- another staff member's report by guessing an id or calling the API directly.
-- current_staff_id() resolves via the auth→staff link (staff-auth-link.sql).
-- =============================================================================

alter table public.shift_reports enable row level security;

drop policy if exists shiftreports_select on public.shift_reports;
create policy shiftreports_select on public.shift_reports for select
  using (organization_id = public.current_org_id()
         and (staff_id = public.current_staff_id()
              or public.has_role('super_admin','org_admin','ops_manager','lifeguard_manager','scheduling_manager')));

drop policy if exists shiftreports_insert on public.shift_reports;
create policy shiftreports_insert on public.shift_reports for insert
  with check (organization_id = public.current_org_id() and staff_id = public.current_staff_id());

drop policy if exists shiftreports_update on public.shift_reports;
create policy shiftreports_update on public.shift_reports for update
  using (organization_id = public.current_org_id()
         and (staff_id = public.current_staff_id()
              or public.has_role('super_admin','org_admin','ops_manager','lifeguard_manager')));

drop policy if exists shiftreports_manage_delete on public.shift_reports;
create policy shiftreports_manage_delete on public.shift_reports for delete
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','ops_manager','lifeguard_manager'));
