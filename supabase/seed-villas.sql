-- =============================================================================
-- PoolOps Pro — DEMO SEED for "Villas on the Ridge" (Dobbs Ferry, NY)
-- A realistic single-community-pool dataset for the free-trial walkthrough:
-- one facility, a small staff roster with shifts, a season of chemical readings,
-- a few chat threads, maintenance issues, and patron counts.
--
-- Run AFTER schema.sql (+ optionally rls-policies.sql, tenant-config.sql).
-- Idempotent: keyed on the org slug + facility name; re-running refreshes, it
-- does not duplicate. ADDITIVE — never drops anything.
-- =============================================================================

do $$
declare
  v_org  uuid;
  v_fac  uuid;
  v_pool uuid;
  v_mgr  uuid;
  v_head uuid;
  v_g1   uuid;
  v_g2   uuid;
  v_g3   uuid;
  v_maint uuid;
  v_ch_all uuid;
  v_ch_guards uuid;
  v_ch_board uuid;
begin
  -- 1) Organization (reuse the tenant-config row if present, else create).
  select id into v_org from public.organizations where slug = 'villas' limit 1;
  if v_org is null then
    insert into public.organizations (name, type, timezone, accent_color, plan, billing_status, slug)
    values ('Villas on the Ridge', 'community_pool', 'America/New_York', '#0F7285', 'small', 'trial', 'villas')
    returning id into v_org;
  end if;

  -- 2) Facility + pool (single community pool).
  select id into v_fac from public.facilities where organization_id = v_org and name = 'Villas on the Ridge Pool' limit 1;
  if v_fac is null then
    insert into public.facilities (organization_id, name, address, pool_type, operating_hours, capacity, emergency_phone, status, chemical_ranges, inspection_required)
    values (v_org, 'Villas on the Ridge Pool', '12 Ridge Terrace, Dobbs Ferry, NY', 'leisure',
            '9:00 AM – 8:00 PM', 120, '(914) 555-0139', 'open',
            '{"freeChlorine":[1.0,4.0],"combinedChlorine":[0,0.4],"ph":[7.2,7.8],"alkalinity":[80,120],"calciumHardness":[200,400],"cyanuricAcid":[30,50],"waterTemp":[78,86]}'::jsonb,
            true)
    returning id into v_fac;
  end if;

  select id into v_pool from public.pools where facility_id = v_fac limit 1;
  if v_pool is null then
    insert into public.pools (facility_id, organization_id, name, pool_type, volume_gallons, max_depth_ft)
    values (v_fac, v_org, 'Main Pool', 'leisure', 96000, 8)
    returning id into v_pool;
  end if;

  -- 3) Staff roster (profile_id left null — these are demo records).
  delete from public.staff_profiles where organization_id = v_org and title like 'DEMO:%';
  insert into public.staff_profiles (organization_id, first_name, last_name, home_facility_id, facility_ids, primary_role, roles, title, age, is_minor, employment_status, preferred_hours_per_week, onboarding_complete)
  values
    (v_org, 'Maria',  'Ellis',   v_fac, array[v_fac], 'ops_manager',       array['ops_manager'],       'DEMO: Pool Manager', 41, false, 'active', 32, 100),
    (v_org, 'Devon',  'Park',    v_fac, array[v_fac], 'head_lifeguard',    array['head_lifeguard'],    'DEMO: Head Guard',   24, false, 'active', 30, 100),
    (v_org, 'Aisha',  'Rahman',  v_fac, array[v_fac], 'lifeguard',         array['lifeguard'],         'DEMO: Lifeguard',    19, false, 'active', 24, 90),
    (v_org, 'Tyler',  'Nguyen',  v_fac, array[v_fac], 'lifeguard',         array['lifeguard'],         'DEMO: Lifeguard',    17, true,  'active', 20, 80),
    (v_org, 'Sofia',  'Marino',  v_fac, array[v_fac], 'lifeguard',         array['lifeguard'],         'DEMO: Lifeguard',    18, false, 'active', 22, 85),
    (v_org, 'Ray',    'Okafor',  v_fac, array[v_fac], 'maintenance',       array['maintenance'],       'DEMO: Maintenance',  46, false, 'active', 20, 100);

  select id into v_mgr   from public.staff_profiles where organization_id = v_org and title = 'DEMO: Pool Manager' limit 1;
  select id into v_head  from public.staff_profiles where organization_id = v_org and title = 'DEMO: Head Guard'   limit 1;
  select id into v_g1    from public.staff_profiles where organization_id = v_org and first_name = 'Aisha' limit 1;
  select id into v_g2    from public.staff_profiles where organization_id = v_org and first_name = 'Tyler' limit 1;
  select id into v_g3    from public.staff_profiles where organization_id = v_org and first_name = 'Sofia' limit 1;
  select id into v_maint from public.staff_profiles where organization_id = v_org and title = 'DEMO: Maintenance'  limit 1;

  -- 4) Shifts for the next 7 days (morning + evening guard coverage).
  delete from public.shifts where organization_id = v_org and notes = 'DEMO';
  insert into public.shifts (organization_id, facility_id, position, shift_date, start_time, end_time, assigned_staff_id, status, notes)
  select v_org, v_fac, 'lifeguard', d::date, '09:00', '13:30',
         (array[v_g1, v_g2, v_g3])[1 + (extract(doy from d)::int % 3)], 'published', 'DEMO'
  from generate_series(current_date, current_date + 6, interval '1 day') d
  union all
  select v_org, v_fac, 'lifeguard', d::date, '13:30', '20:00',
         (array[v_g3, v_g1, v_g2])[1 + (extract(doy from d)::int % 3)], 'published', 'DEMO'
  from generate_series(current_date, current_date + 6, interval '1 day') d
  union all
  select v_org, v_fac, 'head_lifeguard', d::date, '09:00', '17:00', v_head, 'published', 'DEMO'
  from generate_series(current_date, current_date + 6, interval '1 day') d;

  -- 5) A season of chemical readings — one per day for the last 60 days.
  delete from public.chemical_logs where organization_id = v_org and notes = 'DEMO';
  insert into public.chemical_logs
    (organization_id, facility_id, pool_id, free_chlorine, combined_chlorine, ph, alkalinity, calcium_hardness, cyanuric_acid, water_temp, notes, out_of_range, created_at)
  select
    v_org, v_fac, v_pool,
    round((2.0 + random() * 1.6)::numeric, 1),           -- free chlorine 2.0–3.6
    round((random() * 0.35)::numeric, 2),                 -- combined chlorine 0–0.35
    round((7.3 + random() * 0.4)::numeric, 1),            -- pH 7.3–7.7
    round((85 + random() * 30)::numeric, 0),              -- alkalinity 85–115
    round((240 + random() * 120)::numeric, 0),            -- calcium hardness
    round((32 + random() * 14)::numeric, 0),              -- cyanuric acid
    round((79 + random() * 5)::numeric, 0),               -- water temp 79–84
    'DEMO', '{}', (current_date - g)::timestamptz + time '08:15'
  from generate_series(0, 59) g;

  -- 6) Chat channels + a few threads.
  select id into v_ch_all    from public.channels where organization_id = v_org and name = 'All Staff' limit 1;
  if v_ch_all is null then insert into public.channels (organization_id, name, kind, description) values (v_org, 'All Staff', 'all_staff', 'Everyone at the pool') returning id into v_ch_all; end if;
  select id into v_ch_guards from public.channels where organization_id = v_org and name = 'Lifeguards' limit 1;
  if v_ch_guards is null then insert into public.channels (organization_id, name, kind, description) values (v_org, 'Lifeguards', 'role', 'Guard team coordination') returning id into v_ch_guards; end if;
  select id into v_ch_board  from public.channels where organization_id = v_org and name = 'Manager ↔ Board' limit 1;
  if v_ch_board is null then insert into public.channels (organization_id, name, kind, description) values (v_org, 'Manager ↔ Board', 'admin', 'Pool manager and the Board') returning id into v_ch_board; end if;

  delete from public.messages where organization_id = v_org and template = 'DEMO';
  insert into public.messages (organization_id, channel_id, body, kind, pinned, priority, template, created_at) values
    (v_org, v_ch_all,    'Reminder: pool opens at 9 AM this weekend. Please arrive 15 minutes early for opening checks.', 'announcement', true,  'normal', 'DEMO', now() - interval '2 days'),
    (v_org, v_ch_guards, 'Adult swim is 12:00–12:15 every hour. Rotate whistle every 20 minutes in this heat.',            'message',      false, 'normal', 'DEMO', now() - interval '1 day'),
    (v_org, v_ch_guards, 'Heads up — the kiddie pool skimmer basket is cracked, Ray is on it.',                            'message',      false, 'normal', 'DEMO', now() - interval '20 hours'),
    (v_org, v_ch_board,  'Chlorine and pH have been steady all week; latest inspection passed. Full log in Chemicals.',    'message',      false, 'normal', 'DEMO', now() - interval '6 hours');

  -- 7) Maintenance issues.
  delete from public.maintenance_issues where organization_id = v_org and area = 'DEMO';
  insert into public.maintenance_issues (organization_id, facility_id, area, title, description, priority, status, assigned_to) values
    (v_org, v_fac, 'DEMO', 'Cracked skimmer basket (kiddie pool)', 'Replace skimmer basket; ordered part.', 'medium', 'in_progress', v_maint),
    (v_org, v_fac, 'DEMO', 'Gate latch sticking at north entrance', 'Self-closing latch needs lubrication/adjustment.', 'low', 'new', v_maint),
    (v_org, v_fac, 'DEMO', 'Umbrella pole base loose (deck 3)', 'Tighten base; possible sand refill.', 'low', 'resolved', v_maint);

  -- 8) Patron counts for today (hourly).
  delete from public.patron_counts where organization_id = v_org and time_slot like 'DEMO%';
  insert into public.patron_counts (organization_id, facility_id, time_slot, count)
  select v_org, v_fac, 'DEMO ' || to_char(h, 'FM09') || ':00',
         (20 + (h - 9) * 6 + floor(random() * 10))::int
  from generate_series(9, 18) h;

  raise notice 'Villas on the Ridge demo seed complete (org %).', v_org;
end$$;
