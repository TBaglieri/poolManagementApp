-- =============================================================================
-- PoolOps Pro — Seed data (reference + a demo organization)
-- Run AFTER schema.sql (and ideally rls-policies.sql).
--
-- This seeds:
--   • the 12 roles + permission catalog
--   • subscription plans + setup packages
--   • certification catalog
--   • one demo organization ("Tide & Town Aquatics") with facilities & channels
--
-- Staff rows tied to real auth users are NOT seeded here (they require auth.users
-- entries). Create those via Auth signup, then link with organization_members.
-- The web/mobile apps also run fully in MOCK mode with rich bundled demo data.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Roles (the 12 access levels)
-- -----------------------------------------------------------------------------
insert into public.roles (slug, name, short_name, level) values
  ('super_admin',        'Platform Owner / Super Admin',     'Super Admin',  100),
  ('org_admin',          'Organization Admin / Pool Director','Org Admin',    90),
  ('ops_manager',        'Operations Manager',               'Ops Manager',  70),
  ('lifeguard_manager',  'Lifeguard / Aquatics Manager',     'Guard Manager',65),
  ('scheduling_manager', 'Scheduling Manager',               'Scheduler',    60),
  ('payroll_team',       'Payroll / Payment Team',           'Payroll',      55),
  ('hr_coordinator',     'HR / Onboarding Coordinator',      'HR',           55),
  ('head_lifeguard',     'Head Lifeguard',                   'Head Guard',   30),
  ('swim_instructor',    'Swim Instructor',                  'Instructor',   25),
  ('maintenance',        'Maintenance Staff',                'Maintenance',  20),
  ('lifeguard',          'Lifeguard / Staff',                'Lifeguard',    10),
  ('auditor',            'Read-Only Auditor / Inspector',    'Auditor',      15)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Permission catalog (keys match packages/shared/src/rbac/permissions.ts)
-- -----------------------------------------------------------------------------
insert into public.permissions (key, label, module) values
  ('dashboard.view','View dashboard','General'),
  ('reports.view','View reports','General'),
  ('settings.view','View settings','General'),
  ('settings.manage','Edit settings','General'),
  ('roles.manage','Manage roles','General'),
  ('permissions.manage','Manage permissions','General'),
  ('platform.manage','Manage platform','General'),
  ('facilities.view','View facilities','Facilities'),
  ('facilities.manage','Manage facilities','Facilities'),
  ('staff.view','View staff','Staff'),
  ('staff.manage','Edit staff','Staff'),
  ('staff.invite','Invite staff','Staff'),
  ('onboarding.view','View onboarding','Onboarding'),
  ('onboarding.manage','Manage onboarding','Onboarding'),
  ('onboarding.self','Complete own onboarding','Onboarding'),
  ('chat.view','Read chat','Communication'),
  ('chat.announce','Post announcements','Communication'),
  ('schedule.view','View schedule','Scheduling'),
  ('schedule.self','View own schedule','Scheduling'),
  ('schedule.manage','Manage shifts','Scheduling'),
  ('schedule.approve','Approve trades & time-off','Scheduling'),
  ('timeclock.self','Clock self in/out','Time & Pay'),
  ('timeclock.manage','Manage time entries','Time & Pay'),
  ('payroll.view','View payroll','Time & Pay'),
  ('payroll.manage','Approve timesheets','Time & Pay'),
  ('payroll.export','Export payroll','Time & Pay'),
  ('certifications.view','View certifications','Compliance'),
  ('certifications.manage','Manage certifications','Compliance'),
  ('inspections.view','View inspections','Compliance'),
  ('inspections.manage','Run inspections','Compliance'),
  ('chemicals.view','View chemical logs','Operations'),
  ('chemicals.log','Record chemical logs','Operations'),
  ('checklists.view','View checklists','Operations'),
  ('checklists.complete','Complete checklists','Operations'),
  ('checklists.manage','Manage checklist templates','Operations'),
  ('shiftreports.view','View shift reports','Operations'),
  ('shiftreports.submit','Submit shift reports','Operations'),
  ('shiftreports.review','Review shift reports','Operations'),
  ('patroncounts.view','View patron counts','Operations'),
  ('patroncounts.log','Record patron counts','Operations'),
  ('maintenance.view','View maintenance','Operations'),
  ('maintenance.report','Report issues','Operations'),
  ('maintenance.manage','Manage issues','Operations'),
  ('lessons.view','View lessons','Programs'),
  ('lessons.attendance','Take attendance','Programs'),
  ('lessons.manage','Manage lessons','Programs'),
  ('members.view','View members','Programs'),
  ('members.manage','Manage members','Programs'),
  ('documents.view','View documents','Documents'),
  ('documents.manage','Manage documents','Documents'),
  ('community.view','View community network','Facilities')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Certification catalog
-- -----------------------------------------------------------------------------
insert into public.certifications (type, name, issuing_body, valid_months) values
  ('lifeguard','Lifeguard Certification','American Lifesaving Assoc.',24),
  ('cpr_aed','CPR / AED for Professional Rescuers','Red Cross',24),
  ('first_aid','Standard First Aid','Red Cross',24),
  ('wsi','Water Safety Instructor','American Lifesaving Assoc.',36),
  ('cpo_afo','Certified Pool Operator','Pool & Hot Tub Alliance',60),
  ('bloodborne_pathogens','Bloodborne Pathogens','OSHA-aligned',12)
on conflict (type) do nothing;

-- -----------------------------------------------------------------------------
-- Subscription plans + setup packages (placeholder pricing)
-- -----------------------------------------------------------------------------
insert into public.subscription_plans (tier, name, monthly_price, annual_price, limits, features) values
  ('small','Small Pool',49,529,
   '{"facilities":"1","pools":"2","staff":"25"}'::jsonb,
   array['Core scheduling','Time clock','Team messaging','Chemical logs','Checklists','Maintenance','Basic reports']),
  ('medium','Medium Pool',149,1609,
   '{"facilities":"3","pools":"6","staff":"100"}'::jsonb,
   array['Advanced scheduling','Certifications','Lessons','Members','Payroll export','Document library','More reports']),
  ('big','Big Pool / Enterprise',null,null,
   '{"facilities":"unlimited","pools":"unlimited","staff":"100+"}'::jsonb,
   array['Multi-site controls','Advanced permissions','Audit logs','Inspection exports','Custom onboarding','Custom reporting'])
on conflict (tier) do nothing;

insert into public.setup_packages (tier, name, price, summary) values
  ('starter','Starter Setup',0,'Self-guided setup for a single facility.'),
  ('guided','Guided Setup',299,'Assisted onboarding for multi-facility operations.'),
  ('premium','Premium Migration',null,'White-glove migration for multi-site and municipal operations.')
on conflict (tier) do nothing;

-- -----------------------------------------------------------------------------
-- Demo organization + facilities + channels
-- -----------------------------------------------------------------------------
do $$
declare
  v_org uuid;
  v_maplewood uuid;
  v_riverbend uuid;
begin
  insert into public.organizations (name, type, timezone, plan, billing_status)
  values ('Tide & Town Aquatics','community_pool','America/Chicago','medium','active')
  returning id into v_org;

  insert into public.facilities (organization_id, name, address, pool_type, operating_hours, capacity, status)
  values (v_org,'Maplewood Community Pool','412 Maplewood Dr, Cedar Falls','outdoor_competition','6:00 AM – 8:00 PM',240,'open')
  returning id into v_maplewood;

  insert into public.facilities (organization_id, name, address, pool_type, operating_hours, capacity, status)
  values (v_org,'Riverbend Aquatic Center','88 Riverbend Pkwy, Cedar Falls','indoor','5:30 AM – 9:00 PM',320,'open')
  returning id into v_riverbend;

  insert into public.pools (organization_id, facility_id, name, pool_type, volume_gallons, max_depth_ft) values
    (v_org, v_maplewood,'Main Competition Pool','outdoor_competition',410000,12),
    (v_org, v_riverbend,'Indoor 8-Lane','indoor',360000,13);

  insert into public.channels (organization_id, name, kind, description) values
    (v_org,'All Team','all_staff','Everyone — org-wide announcements & coordination'),
    (v_org,'Lifeguards','role','Lifeguard team channel'),
    (v_org,'Managers','role','Management coordination'),
    (v_org,'Maintenance','role','Facilities & maintenance');

  insert into public.organization_subscriptions (organization_id, plan_tier, billing_status, billing_cycle)
  values (v_org,'medium','active','monthly');

  raise notice 'Seeded demo organization % (Maplewood=%, Riverbend=%)', v_org, v_maplewood, v_riverbend;
end$$;

-- Done. The web & mobile apps also ship with full MOCK demo data
-- (packages/shared/src/data/seed.ts) so they work without this seed.
