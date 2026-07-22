-- =============================================================================
-- PoolOps Pro — Row Level Security (RLS) policies (STARTER set)
-- Run AFTER schema.sql.
--
-- ⚠️  These are STARTER policies for a multi-tenant aquatics app. They enforce
--     organization isolation and a few role rules. You MUST review, test, and
--     harden them before production (see SECURITY.md). RBAC shown in the UI is
--     for convenience only — real authorization MUST be enforced here, server-side.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so policies can call them without recursion)
-- -----------------------------------------------------------------------------

-- The caller's organization (from organization_members).
create or replace function public.current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.organization_members
  where profile_id = auth.uid() and status = 'active'
  limit 1;
$$;

-- The caller's role slug within their org.
create or replace function public.current_role_slug()
returns text language sql stable security definer set search_path = public as $$
  select role_slug from public.organization_members
  where profile_id = auth.uid() and status = 'active'
  limit 1;
$$;

-- True if caller has any of the given roles.
create or replace function public.has_role(variadic slugs text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where profile_id = auth.uid() and status = 'active' and role_slug = any(slugs)
  );
$$;

-- True if caller is an org-level admin (manage everything in the org).
create or replace function public.is_org_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('super_admin','org_admin');
$$;

-- The staff_profiles row id for the caller (their "own" staff record).
create or replace function public.current_staff_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.staff_profiles where profile_id = auth.uid() limit 1;
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS on all app tables
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
      and table_name not in ('roles','permissions','role_permissions',
                             'certifications','subscription_plans','setup_packages')
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end$$;

-- Reference tables: readable by any authenticated user.
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.certifications enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.setup_packages enable row level security;

drop policy if exists ref_roles_read on public.roles;
create policy ref_roles_read on public.roles for select using (auth.role() = 'authenticated');
drop policy if exists ref_perms_read on public.permissions;
create policy ref_perms_read on public.permissions for select using (auth.role() = 'authenticated');
drop policy if exists ref_roleperms_read on public.role_permissions;
create policy ref_roleperms_read on public.role_permissions for select using (auth.role() = 'authenticated');
drop policy if exists ref_certs_read on public.certifications;
create policy ref_certs_read on public.certifications for select using (auth.role() = 'authenticated');
drop policy if exists ref_plans_read on public.subscription_plans;
create policy ref_plans_read on public.subscription_plans for select using (true);
drop policy if exists ref_setup_read on public.setup_packages;
create policy ref_setup_read on public.setup_packages for select using (true);

-- -----------------------------------------------------------------------------
-- Generic org-isolation policies for tables that have organization_id.
-- SELECT: same org. WRITE (insert/update/delete): managers/admins by default.
-- More specific tables get tighter overrides below.
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_name = c.table_name and tb.table_schema = 'public'
    where c.table_schema = 'public' and c.column_name = 'organization_id'
      and tb.table_type = 'BASE TABLE'
      and c.table_name not in ('time_off_requests','time_clock_entries','onboarding_submissions',
                               'maintenance_issues','messages','notifications','staff_certifications',
                               'payroll_reviews','payroll_exports','pay_periods','documents','audit_logs')
  loop
    execute format('drop policy if exists org_select on public.%I;', t);
    execute format(
      'create policy org_select on public.%I for select
       using (organization_id = public.current_org_id());', t);

    execute format('drop policy if exists org_write on public.%I;', t);
    execute format(
      'create policy org_write on public.%I for all
       using (organization_id = public.current_org_id() and public.has_role(
              ''super_admin'',''org_admin'',''ops_manager'',''lifeguard_manager'',
              ''scheduling_manager'',''hr_coordinator''))
       with check (organization_id = public.current_org_id());', t);
  end loop;
end$$;

-- -----------------------------------------------------------------------------
-- profiles: a user sees their own profile + others in their org; edits own.
-- -----------------------------------------------------------------------------
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select
  using (id = auth.uid() or organization_id = public.current_org_id());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- organization_members: visible within org; managed by admins.
drop policy if exists members_select on public.organization_members;
create policy members_select on public.organization_members for select
  using (organization_id = public.current_org_id());
drop policy if exists members_admin on public.organization_members;
create policy members_admin on public.organization_members for all
  using (organization_id = public.current_org_id() and public.is_org_admin())
  with check (organization_id = public.current_org_id());

-- organizations: members can read their org; admins update.
drop policy if exists org_read on public.organizations;
create policy org_read on public.organizations for select
  using (id = public.current_org_id());
drop policy if exists org_admin_update on public.organizations;
create policy org_admin_update on public.organizations for update
  using (id = public.current_org_id() and public.is_org_admin());

-- -----------------------------------------------------------------------------
-- LOWEST-LEVEL STAFF rules
-- -----------------------------------------------------------------------------

-- staff_profiles: everyone in org can see basic roster; staff edit only their own;
-- managers/HR manage all. (pay_rate column is sensitive — restrict via a view or
-- column privileges in production; see SECURITY.md.)
drop policy if exists staff_select on public.staff_profiles;
create policy staff_select on public.staff_profiles for select
  using (organization_id = public.current_org_id());
drop policy if exists staff_self_update on public.staff_profiles;
create policy staff_self_update on public.staff_profiles for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists staff_manage on public.staff_profiles;
create policy staff_manage on public.staff_profiles for all
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','hr_coordinator','ops_manager'))
  with check (organization_id = public.current_org_id());

-- time_off_requests: staff see/insert their OWN; managers see all & approve.
drop policy if exists timeoff_self_select on public.time_off_requests;
create policy timeoff_self_select on public.time_off_requests for select
  using (organization_id = public.current_org_id()
         and (staff_id = public.current_staff_id()
              or public.has_role('super_admin','org_admin','ops_manager',
                                 'lifeguard_manager','scheduling_manager')));
drop policy if exists timeoff_self_insert on public.time_off_requests;
create policy timeoff_self_insert on public.time_off_requests for insert
  with check (organization_id = public.current_org_id() and staff_id = public.current_staff_id());
drop policy if exists timeoff_manager_update on public.time_off_requests;
create policy timeoff_manager_update on public.time_off_requests for update
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','ops_manager',
                             'lifeguard_manager','scheduling_manager'));

-- time_clock_entries: staff clock THEMSELVES; payroll/managers see all.
drop policy if exists clock_self_select on public.time_clock_entries;
create policy clock_self_select on public.time_clock_entries for select
  using (organization_id = public.current_org_id()
         and (staff_id = public.current_staff_id()
              or public.has_role('super_admin','org_admin','ops_manager',
                                 'lifeguard_manager','payroll_team')));
drop policy if exists clock_self_write on public.time_clock_entries;
create policy clock_self_write on public.time_clock_entries for insert
  with check (organization_id = public.current_org_id() and staff_id = public.current_staff_id());
drop policy if exists clock_self_update on public.time_clock_entries;
create policy clock_self_update on public.time_clock_entries for update
  using (organization_id = public.current_org_id()
         and (staff_id = public.current_staff_id()
              or public.has_role('super_admin','org_admin','payroll_team','ops_manager')));

-- onboarding_submissions: staff complete their OWN; HR/admin manage all.
drop policy if exists onboarding_self on public.onboarding_submissions;
create policy onboarding_self on public.onboarding_submissions for select
  using (organization_id = public.current_org_id()
         and (staff_id = public.current_staff_id()
              or public.has_role('super_admin','org_admin','hr_coordinator')));
drop policy if exists onboarding_self_write on public.onboarding_submissions;
create policy onboarding_self_write on public.onboarding_submissions for all
  using (organization_id = public.current_org_id()
         and (staff_id = public.current_staff_id()
              or public.has_role('super_admin','org_admin','hr_coordinator')))
  with check (organization_id = public.current_org_id());

-- maintenance_issues: any staff can REPORT (insert) & view; managers/maintenance manage.
drop policy if exists maint_select on public.maintenance_issues;
create policy maint_select on public.maintenance_issues for select
  using (organization_id = public.current_org_id());
drop policy if exists maint_report on public.maintenance_issues;
create policy maint_report on public.maintenance_issues for insert
  with check (organization_id = public.current_org_id());
drop policy if exists maint_manage on public.maintenance_issues;
create policy maint_manage on public.maintenance_issues for update
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','ops_manager','lifeguard_manager','maintenance'));

-- messages: all org members READ All-Team & channels; announce roles post.
-- (Channel-level restriction is enforced in app logic + channel.restricted_to_roles.)
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select
  using (organization_id = public.current_org_id());
drop policy if exists messages_post on public.messages;
create policy messages_post on public.messages for insert
  with check (organization_id = public.current_org_id() and sender_id = auth.uid());
drop policy if exists messages_pin on public.messages;
create policy messages_pin on public.messages for update
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','ops_manager',
                             'lifeguard_manager','scheduling_manager','hr_coordinator','payroll_team'));

-- notifications: a user only sees & updates their OWN notifications.
drop policy if exists notif_self on public.notifications;
create policy notif_self on public.notifications for select
  using (user_id = auth.uid());
drop policy if exists notif_self_update on public.notifications;
create policy notif_self_update on public.notifications for update
  using (user_id = auth.uid());

-- staff_certifications: viewable in org by managers/compliance; staff see own.
drop policy if exists certs_select on public.staff_certifications;
create policy certs_select on public.staff_certifications for select
  using (organization_id = public.current_org_id()
         and (staff_id = public.current_staff_id()
              or public.has_role('super_admin','org_admin','ops_manager',
                                 'lifeguard_manager','hr_coordinator','auditor')));
drop policy if exists certs_manage on public.staff_certifications;
create policy certs_manage on public.staff_certifications for all
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','lifeguard_manager','hr_coordinator'))
  with check (organization_id = public.current_org_id());

-- -----------------------------------------------------------------------------
-- PAYROLL / PAYMENT TEAM rules — payroll roles only (NOT lowest-level staff)
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select unnest(array['pay_periods','payroll_reviews','payroll_exports']) loop
    execute format('drop policy if exists payroll_read on public.%I;', t);
    execute format(
      'create policy payroll_read on public.%I for select
       using (organization_id = public.current_org_id()
              and public.has_role(''super_admin'',''org_admin'',''payroll_team''));', t);
    execute format('drop policy if exists payroll_write on public.%I;', t);
    execute format(
      'create policy payroll_write on public.%I for all
       using (organization_id = public.current_org_id()
              and public.has_role(''super_admin'',''org_admin'',''payroll_team''))
       with check (organization_id = public.current_org_id());', t);
  end loop;
end$$;

-- documents: tax/payroll/sensitive docs restricted; others visible in org.
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents for select
  using (
    organization_id = public.current_org_id()
    and (
      sensitive = false
      or public.has_role('super_admin','org_admin','hr_coordinator','payroll_team')
      or public.current_role_slug() = any(visible_to_roles)
    )
  );
drop policy if exists documents_manage on public.documents;
create policy documents_manage on public.documents for all
  using (organization_id = public.current_org_id()
         and public.has_role('super_admin','org_admin','hr_coordinator'))
  with check (organization_id = public.current_org_id());

-- audit_logs: only admins read; any authenticated action can insert.
drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select
  using (organization_id = public.current_org_id() and public.is_org_admin());
drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs for insert
  with check (organization_id = public.current_org_id());

-- quote_requests: public can submit (marketing form); admins read.
drop policy if exists quote_insert on public.quote_requests;
create policy quote_insert on public.quote_requests for insert with check (true);
drop policy if exists quote_read on public.quote_requests;
create policy quote_read on public.quote_requests for select
  using (public.has_role('super_admin','org_admin'));

-- Done. Next: realtime.sql
