-- =============================================================================
-- PoolOps Pro — Realtime configuration
-- Run AFTER schema.sql (RLS recommended first too).
--
-- Adds the listed tables to the `supabase_realtime` publication so the web and
-- mobile clients receive INSERT/UPDATE/DELETE events. The shared subscription
-- helpers live in packages/supabase/src/realtime.ts.
--
-- You can also toggle Realtime per-table in the dashboard:
--   Database → Replication → supabase_realtime → add tables.
-- =============================================================================

-- Ensure the publication exists (Supabase creates it by default).
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end$$;

-- Helper: add a table to the publication only if not already present.
create or replace function public._add_to_realtime(tbl text)
returns void language plpgsql as $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
  ) then
    execute format('alter publication supabase_realtime add table public.%I;', tbl);
  end if;
end$$;

select public._add_to_realtime('messages');
select public._add_to_realtime('announcements');
select public._add_to_realtime('channels');
select public._add_to_realtime('shifts');
select public._add_to_realtime('shift_assignments');
select public._add_to_realtime('schedule_drafts');
select public._add_to_realtime('schedule_draft_shifts');
select public._add_to_realtime('schedule_publish_events');
select public._add_to_realtime('time_off_requests');
select public._add_to_realtime('shift_trade_requests');
select public._add_to_realtime('time_clock_entries');
select public._add_to_realtime('chemical_logs');
select public._add_to_realtime('checklist_completions');
select public._add_to_realtime('maintenance_issues');
select public._add_to_realtime('notifications');
select public._add_to_realtime('facilities');
select public._add_to_realtime('staff_invitations');
select public._add_to_realtime('organization_members');

drop function public._add_to_realtime(text);

-- Optional: ensure UPDATE/DELETE payloads include the full old row (needed if you
-- filter on columns that change). REPLICA IDENTITY FULL costs more WAL — enable
-- only where you need it.
-- alter table public.shifts replica identity full;
-- alter table public.schedule_draft_shifts replica identity full;

-- Done. Next: storage.sql
