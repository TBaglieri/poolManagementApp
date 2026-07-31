-- =============================================================================
-- PoolOps Pro — per-tenant facility cap (Fix 4, backend enforcement).
-- Run AFTER schema.sql and rls-policies.sql. Idempotent.
--
-- Villas is a single community pool. The UI hides "Add facility" at the cap, but the
-- limit is also enforced here so it can't be bypassed via a raw insert. A dedicated
-- column (not the config JSON) keeps the RLS predicate simple and reliable.
--   • organizations.max_facilities  — the cap; NULL = unlimited (the default).
-- =============================================================================

alter table public.organizations add column if not exists max_facilities int;

-- Villas → one facility. Other tenants stay NULL (unlimited).
update public.organizations set max_facilities = 1
  where slug = 'villas' and max_facilities is distinct from 1;

-- RESTRICTIVE so it AND-combines with the existing permissive org_write grant:
-- a manager may insert a facility ONLY while under the tenant's cap.
drop policy if exists facilities_under_cap on public.facilities;
create policy facilities_under_cap on public.facilities as restrictive for insert
  with check (
    (select o.max_facilities from public.organizations o where o.id = public.current_org_id()) is null
    or (select count(*) from public.facilities f where f.organization_id = public.current_org_id())
       < (select o.max_facilities from public.organizations o where o.id = public.current_org_id())
  );
