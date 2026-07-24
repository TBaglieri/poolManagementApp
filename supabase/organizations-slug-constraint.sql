-- =============================================================================
-- PoolOps Pro — organizations.slug hardening — ADDITIVE, safe to re-run.
-- Run AFTER schema.sql and tenant-config.sql (which adds the slug column).
--
-- WHY: a duplicate "Villas on the Ridge" org with slug = NULL (created by an early
-- seed run before the slug column existed) had a membership pointing at it. With no
-- slug, the router had nothing to route to, so login fell back to the platform
-- context. This makes that state UNREPRESENTABLE going forward:
--   • slug is UNIQUE  → a tenant can never have two org rows.
--   • slug is NOT NULL → an org can never exist without a routable slug.
--
-- ORDER MATTERS: the UNIQUE constraint is created BEFORE the NOT NULL flip and
-- before any upsert that conflicts on slug — a prior attempt failed with 42P10
-- ("no unique or exclusion constraint matching the ON CONFLICT specification")
-- because the seed upsert ran against a slug column that had no matchable unique
-- constraint yet.
-- =============================================================================

-- 0) Ensure the column exists (tenant-config.sql normally adds it; be self-contained).
alter table public.organizations add column if not exists slug text;

-- 1) Best-effort backfill for the two known bundled tenants, matched by name, so an
--    older row without a slug becomes routable instead of blocking the NOT NULL flip.
update public.organizations set slug = 'villas'
  where slug is null and name = 'Villas on the Ridge';
update public.organizations set slug = 'tidetown'
  where slug is null and name = 'Tide & Town Aquatics';

-- 2) Fail LOUDLY if any org still has a null slug — better a clear error than a
--    silent NOT NULL failure or, worse, another slug-less org slipping through.
do $$
declare
  bad int;
  sample text;
begin
  select count(*), string_agg(distinct name, ', ') into bad, sample
    from public.organizations where slug is null;
  if bad > 0 then
    raise exception
      'Cannot enforce organizations.slug NOT NULL: % org(s) still have a null slug (%). Give each a unique slug, or delete the stray row, then re-run.',
      bad, sample;
  end if;
end $$;

-- 3) UNIQUE constraint FIRST (drop the plain unique index from tenant-config.sql and
--    replace it with a named table constraint so ON CONFLICT (slug) always matches).
alter table public.organizations drop constraint if exists organizations_slug_key;
drop index if exists idx_org_slug;
alter table public.organizations add constraint organizations_slug_key unique (slug);

-- 4) THEN NOT NULL (safe now that every row has a slug and duplicates are impossible).
alter table public.organizations alter column slug set not null;

-- Done. organizations.slug is now NOT NULL + UNIQUE. Re-running is a no-op.
