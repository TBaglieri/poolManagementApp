-- =============================================================================
-- PoolOps Pro — auto-stamp organization_id on insert (Fix 6 persistence).
-- Run AFTER schema.sql and rls-policies.sql (needs public.current_org_id()).
--
-- WHY: every org-scoped table has organization_id NOT NULL, but the web/mobile
-- clients insert rows WITHOUT it (chemical_logs, messages, channels, maintenance,
-- time-off, trades, …). Those inserts were failing silently against RLS/NOT NULL,
-- so "Create/Save" appeared to do nothing or vanished on refresh. This BEFORE INSERT
-- trigger fills organization_id from the caller's JWT (current_org_id()) when it's
-- null, so a create always lands in the RIGHT tenant with no client plumbing — and
-- the RLS `with check (organization_id = current_org_id())` still validates it.
--
-- Safe + idempotent: only fills a NULL (an explicit value, e.g. a service-role
-- cross-org insert, is preserved), and re-running just re-creates the triggers.
-- =============================================================================

create or replace function public.set_org_id_default()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then
    new.organization_id := public.current_org_id();
  end if;
  return new;
end$$;

do $$
declare t text;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_name = c.table_name and tb.table_schema = 'public'
    where c.table_schema = 'public'
      and c.column_name = 'organization_id'
      and tb.table_type = 'BASE TABLE'
      and c.table_name <> 'organizations'   -- the org row itself has no parent org
  loop
    execute format('drop trigger if exists trg_set_org_id on public.%I;', t);
    execute format(
      'create trigger trg_set_org_id before insert on public.%I
       for each row execute function public.set_org_id_default();', t);
  end loop;
end$$;
