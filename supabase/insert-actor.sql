-- =============================================================================
-- PoolOps Pro — default "who did this" columns to the caller (Fix 6 persistence).
-- Run AFTER schema.sql and rls-policies.sql. Idempotent.
--
-- WHY: several actor columns reference profiles(id) = the auth user
-- (chemical_logs.recorded_by, maintenance_issues.reported_by, messages.sender_id,
-- channels.created_by, checklist_completions.completed_by, patron_counts.recorded_by).
-- The web/mobile clients attribute by staff_profiles.id, so passing that id violated
-- the FK (and messages_post RLS needs sender_id = auth.uid()). Inserts failed
-- silently, so chem logs, maintenance, and chat messages never persisted.
--
-- Fix: a BEFORE INSERT trigger fills each of these columns with auth.uid() when the
-- client leaves it null. The clients now OMIT the column, so the row persists with
-- the correct actor and the RLS with-check still passes (triggers run first).
-- Explicit non-null values (e.g. a service-role backfill) are preserved.
-- =============================================================================

-- One function per column (plpgsql can't assign NEW.<dynamic>).
create or replace function public.default_sender_id() returns trigger language plpgsql security definer set search_path = public as $$
begin if new.sender_id  is null then new.sender_id  := auth.uid(); end if; return new; end$$;
create or replace function public.default_recorded_by() returns trigger language plpgsql security definer set search_path = public as $$
begin if new.recorded_by is null then new.recorded_by := auth.uid(); end if; return new; end$$;
create or replace function public.default_completed_by() returns trigger language plpgsql security definer set search_path = public as $$
begin if new.completed_by is null then new.completed_by := auth.uid(); end if; return new; end$$;
create or replace function public.default_reported_by() returns trigger language plpgsql security definer set search_path = public as $$
begin if new.reported_by is null then new.reported_by := auth.uid(); end if; return new; end$$;
create or replace function public.default_created_by() returns trigger language plpgsql security definer set search_path = public as $$
begin if new.created_by  is null then new.created_by  := auth.uid(); end if; return new; end$$;

-- Attach each function to every base table that actually has that column.
do $$
declare t text; rec record;
begin
  for rec in select * from (values
    ('sender_id','default_sender_id'), ('recorded_by','default_recorded_by'),
    ('completed_by','default_completed_by'), ('reported_by','default_reported_by'),
    ('created_by','default_created_by')) as v(col, fn)
  loop
    for t in
      select c.table_name from information_schema.columns c
      join information_schema.tables tb
        on tb.table_name = c.table_name and tb.table_schema = 'public'
      where c.table_schema = 'public' and c.column_name = rec.col and tb.table_type = 'BASE TABLE'
    loop
      execute format('drop trigger if exists trg_%s on public.%I;', rec.fn, t);
      execute format('create trigger trg_%s before insert on public.%I for each row execute function public.%s();', rec.fn, t, rec.fn);
    end loop;
  end loop;
end$$;
