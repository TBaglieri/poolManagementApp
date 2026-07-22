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
-- Demo organization: facilities, channels, staff (per role), scheduling scenario,
-- time off, certifications, time clock, ops data, and quote examples.
--
-- Staff are seeded as staff_profiles WITHOUT a linked auth user (profile_id is
-- null) — they are roster entries. When a real person signs up via Supabase Auth,
-- link them by setting staff_profiles.profile_id = their profiles.id.
-- -----------------------------------------------------------------------------
do $$
declare
  v_org uuid;
  fac_mw uuid; fac_rb uuid; fac_ns uuid; fac_lk uuid;
  ch_all uuid; ch_guards uuid; ch_mgrs uuid;
  -- staff (one per role + extra lifeguards for scheduling)
  st_owner uuid; st_admin uuid; st_ops uuid; st_gmgr uuid; st_sched uuid; st_pay uuid;
  st_hr uuid; st_head uuid; st_lg1 uuid; st_lg2 uuid; st_lg_exp uuid; st_inst uuid;
  st_maint uuid; st_aud uuid;
  pp uuid;
  avail jsonb := '[
    {"day":"mon","start":"08:00","end":"18:00","preference":"available"},
    {"day":"tue","start":"08:00","end":"18:00","preference":"preferred"},
    {"day":"wed","start":"12:00","end":"20:00","preference":"available"},
    {"day":"thu","start":"08:00","end":"14:00","preference":"available"},
    {"day":"fri","start":"08:00","end":"18:00","preference":"preferred"},
    {"day":"sat","start":"09:00","end":"17:00","preference":"available"},
    {"day":"sun","start":"00:00","end":"00:00","preference":"unavailable"}
  ]'::jsonb;
  next_mon date := date_trunc('week', now())::date + 7;  -- Monday of next week
begin
  -- Idempotent: if the demo org already exists, don't seed a second copy.
  if exists (select 1 from public.organizations where name = 'Tide & Town Aquatics') then
    raise notice 'Demo org already seeded — skipping.';
    return;
  end if;

  insert into public.organizations (name, type, timezone, plan, billing_status, season_start, season_end)
  values ('Tide & Town Aquatics','community_pool','America/Chicago','medium','active', now()::date - 40, now()::date + 75)
  returning id into v_org;

  insert into public.facilities (organization_id, name, address, pool_type, operating_hours, capacity, status, inspection_required) values
    (v_org,'Maplewood Community Pool','412 Maplewood Dr, Cedar Falls','outdoor_competition','6:00 AM – 8:00 PM',240,'open',true)   returning id into fac_mw;
  insert into public.facilities (organization_id, name, address, pool_type, operating_hours, capacity, status, inspection_required) values
    (v_org,'Riverbend Aquatic Center','88 Riverbend Pkwy, Cedar Falls','indoor','5:30 AM – 9:00 PM',320,'open',true)              returning id into fac_rb;
  insert into public.facilities (organization_id, name, address, pool_type, operating_hours, capacity, status, inspection_required) values
    (v_org,'Northside Swim Club','1500 Northgate Ave, Cedar Falls','lap','6:00 AM – 7:00 PM',150,'weather_delay',true)           returning id into fac_ns;
  insert into public.facilities (organization_id, name, address, pool_type, operating_hours, capacity, status, inspection_required) values
    (v_org,'Lakeside Wading Pool','7 Lakeside Loop, Cedar Falls','wading','9:00 AM – 6:00 PM',60,'maintenance',false)            returning id into fac_lk;

  insert into public.pools (organization_id, facility_id, name, pool_type, volume_gallons, max_depth_ft) values
    (v_org, fac_mw,'Main Competition Pool','outdoor_competition',410000,12),
    (v_org, fac_mw,'Kiddie Splash Area','splash_pad',18000,1.5),
    (v_org, fac_rb,'Indoor 8-Lane','indoor',360000,13),
    (v_org, fac_ns,'6-Lane Lap Pool','lap',240000,9),
    (v_org, fac_lk,'Wading Pool','wading',22000,2);

  insert into public.channels (organization_id, name, kind, description) values
    (v_org,'All Team','all_staff','Everyone — org-wide announcements & coordination') returning id into ch_all;
  insert into public.channels (organization_id, name, kind, description, restricted_to_roles) values
    (v_org,'Lifeguards','role','Lifeguard team channel', array['lifeguard','head_lifeguard','lifeguard_manager','ops_manager','org_admin','super_admin']) returning id into ch_guards;
  insert into public.channels (organization_id, name, kind, description, restricted_to_roles) values
    (v_org,'Managers','role','Management coordination', array['ops_manager','lifeguard_manager','scheduling_manager','org_admin','super_admin','hr_coordinator']) returning id into ch_mgrs;
  insert into public.channels (organization_id, name, kind, description, restricted_to_roles) values
    (v_org,'Payroll / Admin','admin','Office & payroll', array['payroll_team','hr_coordinator','org_admin','super_admin']);
  insert into public.channels (organization_id, name, kind, description, facility_id) values
    (v_org,'Maplewood Pool','facility','Maplewood team', fac_mw);

  insert into public.organization_subscriptions (organization_id, plan_tier, billing_status, billing_cycle)
  values (v_org,'medium','active','monthly');

  -- Staff (one per role + lifeguards for a real scheduling scenario)
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, is_minor, employment_status, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Dana','Whitfield','super_admin',array['super_admin'],fac_mw,array[fac_mw,fac_rb,fac_ns,fac_lk],'Founder & CEO',44,false,'active',avail,40,0,100) returning id into st_owner;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, employment_status, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Marcus','Reyes','org_admin',array['org_admin'],fac_mw,array[fac_mw,fac_rb,fac_ns,fac_lk],'Pool Director',38,'active',avail,40,45,100) returning id into st_admin;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Priya','Nair','ops_manager',array['ops_manager'],fac_rb,array[fac_rb,fac_ns],'Operations Manager',33,avail,40,32,100) returning id into st_ops;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Tom','Halvorsen','lifeguard_manager',array['lifeguard_manager'],fac_mw,array[fac_mw,fac_lk],'Aquatics Manager',29,avail,40,30,100) returning id into st_gmgr;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Sofia','Marin','scheduling_manager',array['scheduling_manager'],fac_rb,array[fac_mw,fac_rb,fac_ns,fac_lk],'Scheduling Manager',31,avail,40,28,100) returning id into st_sched;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Grace','Liu','payroll_team',array['payroll_team'],fac_mw,array[fac_mw],'Payroll Specialist',36,avail,40,30,100) returning id into st_pay;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Andre','Brooks','hr_coordinator',array['hr_coordinator'],fac_mw,array[fac_mw],'HR & Onboarding',34,avail,40,29,100) returning id into st_hr;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Jordan','Kim','head_lifeguard',array['head_lifeguard'],fac_mw,array[fac_mw,fac_lk],'Head Lifeguard',23,avail,32,21,100) returning id into st_head;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Maya','Patel','lifeguard',array['lifeguard'],fac_rb,array[fac_rb],'Lifeguard',19,avail,28,17,100) returning id into st_lg1;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, is_minor, employment_status, status_flags, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Ethan','Cole','lifeguard',array['lifeguard'],fac_mw,array[fac_mw],'Lifeguard',17,true,'pending_onboarding',array['pending_onboarding','missing_forms'],avail,18,16,45) returning id into st_lg2;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, status_flags, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Noah','Berg','lifeguard',array['lifeguard'],fac_lk,array[fac_lk],'Lifeguard',18,array['certification_expiring'],avail,24,17,100) returning id into st_lg_exp;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Ruby','Sanchez','swim_instructor',array['swim_instructor'],fac_rb,array[fac_rb],'Swim Instructor',27,avail,20,22,100) returning id into st_inst;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Hank','Dawson','maintenance',array['maintenance'],fac_mw,array[fac_mw,fac_rb,fac_ns,fac_lk],'Facilities & Maintenance',41,avail,40,23,100) returning id into st_maint;
  insert into public.staff_profiles (organization_id, first_name, last_name, primary_role, roles, home_facility_id, facility_ids, title, age, employment_status, availability, preferred_hours_per_week, pay_rate, onboarding_complete) values
   (v_org,'Eleanor','Vance','auditor',array['auditor'],fac_mw,array[fac_mw,fac_rb,fac_ns,fac_lk],'County Health Inspector',52,'seasonal',avail,8,0,100) returning id into st_aud;

  -- Certifications: valid for guards/instructor, EXPIRED lifeguard cert for Noah.
  insert into public.staff_certifications (organization_id, staff_id, type, status, issued_date, expires_date) values
    (v_org, st_head,'lifeguard','valid', now()::date-300, now()::date+400),
    (v_org, st_head,'cpr_aed','valid', now()::date-300, now()::date+400),
    (v_org, st_lg1,'lifeguard','valid', now()::date-200, now()::date+500),
    (v_org, st_lg1,'cpr_aed','valid', now()::date-200, now()::date+500),
    (v_org, st_lg_exp,'lifeguard','expired', now()::date-800, now()::date-20),   -- EXPIRED example
    (v_org, st_lg_exp,'cpr_aed','expired', now()::date-800, now()::date-8),
    (v_org, st_inst,'wsi','valid', now()::date-300, now()::date+600);

  -- Approved time off next week (the Auto Builder will visibly avoid these).
  insert into public.time_off_requests (organization_id, staff_id, start_date, end_date, reason, type, status) values
    (v_org, st_lg1, next_mon+1, next_mon+2, 'Family vacation','vacation','approved'),
    (v_org, st_head, next_mon+4, next_mon+4, 'College orientation','school','approved'),
    (v_org, st_inst, next_mon, next_mon, 'Personal day','personal','approved'),
    (v_org, st_lg2, next_mon+3, next_mon+3, 'Doctor appointment','personal','pending');

  -- Shifts this week (some assigned, some OPEN for pickup).
  insert into public.shifts (organization_id, facility_id, position, shift_date, start_time, end_time, assigned_staff_id, status) values
    (v_org, fac_mw,'lifeguard', now()::date, '08:00','13:00', st_head,'published'),
    (v_org, fac_mw,'lifeguard', now()::date, '13:00','18:00', st_lg2,'published'),
    (v_org, fac_rb,'lifeguard', now()::date, '06:00','12:00', st_lg1,'published'),
    (v_org, fac_rb,'lifeguard', now()::date, '12:00','17:00', null,'open'),
    (v_org, fac_ns,'lifeguard', now()::date, '08:00','13:00', null,'open'),
    (v_org, fac_lk,'lifeguard', now()::date+1, '10:00','15:00', null,'open');

  -- Time clock: a couple currently clocked in + a flagged missed punch.
  insert into public.time_clock_entries (organization_id, facility_id, staff_id, clock_in, status, flagged, note) values
    (v_org, fac_mw, st_head, now() - interval '2 hours','clocked_in', false, null),
    (v_org, fac_rb, st_lg1, now() - interval '3 hours','clocked_in', false, null),
    (v_org, fac_mw, st_lg2, null,'missed_in', true, 'Scheduled 08:00 — no clock-in recorded');

  -- All Team messages (sender null = system/seed; real users post as themselves).
  insert into public.messages (organization_id, channel_id, sender_id, body, pinned, kind) values
    (v_org, ch_all, null, 'Welcome to the 2026 season, team! Safety is our #1 priority every shift.', true, 'message'),
    (v_org, ch_all, null, '📅 Next week''s schedule will be published soon — watch this channel.', false, 'message'),
    (v_org, ch_guards, null, 'In-service training this Saturday 8am at Maplewood. Bring your rescue tube.', false, 'message');

  -- Chemical logs.
  insert into public.chemical_logs (organization_id, facility_id, free_chlorine, combined_chlorine, ph, alkalinity, calcium_hardness, cyanuric_acid, water_temp, notes, out_of_range) values
    (v_org, fac_mw, 2.4, 0.2, 7.5, 100, 280, 40, 82, 'Opening test — all in range.', array[]::text[]),
    (v_org, fac_rb, 5.2, 0.2, 7.5, 108, 315, 39, 81, 'FC spiked after shock — pool closed until below 4.0.', array['freeChlorine']);

  -- Maintenance issues.
  insert into public.maintenance_issues (organization_id, facility_id, area, title, description, priority, status, assigned_to, photo_path) values
    (v_org, fac_lk,'Pump Room','Circulation pump grinding noise','Possible bearing/seal failure.','urgent','waiting_parts', st_maint,'maintenance-photos/lakeside-pump.jpg'),
    (v_org, fac_ns,'Deck','Loose deck tile near lane 1','Trip hazard — tile lifting at corner.','high','new', null, null);

  -- Checklist template + items + a completion.
  declare cl uuid;
  begin
    insert into public.checklist_templates (organization_id, name, kind, cadence, facility_ids)
    values (v_org,'Daily Opening Checklist','opening','daily', array[fac_mw,fac_rb,fac_ns,fac_lk]) returning id into cl;
    insert into public.checklist_items (template_id, label, sort_order) values
      (cl,'Unlock gates and turn on lights',1),
      (cl,'Test chemical levels and log results',2),
      (cl,'Inspect pool deck for hazards',3),
      (cl,'Confirm rescue equipment in place',4),
      (cl,'Check AED and first-aid stations',5);
    insert into public.checklist_completions (organization_id, template_id, facility_id, status, note)
    values (v_org, cl, fac_mw,'complete','All clear at open.');
  end;

  -- Pay period + reviews for the payroll page.
  insert into public.pay_periods (organization_id, label, start_date, end_date, status)
  values (v_org, to_char(now()::date-12,'Mon DD')||' – '||to_char(now()::date+2,'Mon DD'), now()::date-12, now()::date+2,'needs_review')
  returning id into pp;
  insert into public.payroll_reviews (organization_id, pay_period_id, staff_id, regular_hours, overtime_hours, status, has_missing_punch, note) values
    (v_org, pp, st_head, 34, 2,'needs_review', false,'Overtime — confirm approval'),
    (v_org, pp, st_lg1, 28, 0,'ready', false, null),
    (v_org, pp, st_lg2, 16, 0,'needs_review', true,'Missing clock-out — verify hours');

  raise notice 'Seeded Tide & Town Aquatics (org=%) with 4 facilities, 14 staff, scheduling, ops & payroll demo data.', v_org;
end$$;

-- Example quote requests (public marketing form submissions).
insert into public.quote_requests (organization_name, contact_name, email, org_type, facility_count, pool_count, staff_count, recommended_plan, modules, message, status) values
  ('Cedar Falls Parks & Rec','Jordan Smith','jordan@cedarfalls.gov','municipality',5,9,140,'big', array['Scheduling','Inspections','Payroll export'],'Multi-site aquatics for the city — need procurement-friendly billing.','new'),
  ('Riverside Swim League','Avery Cole','avery@riversideswim.org','swim_club',2,4,42,'medium', array['Scheduling','Lessons','Certifications'],'Two pools, summer league + lessons.','new')
on conflict do nothing;

-- Done. The web & mobile apps also ship with full MOCK demo data
-- (packages/shared/src/data/seed.ts) so they work without this seed.
