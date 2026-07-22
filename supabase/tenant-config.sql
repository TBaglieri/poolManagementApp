-- =============================================================================
-- PoolOps Pro — Tenant configuration (white-label) — ADDITIVE, safe to re-run
-- Run AFTER schema.sql (any time). Adds ONE column and seeds tenant configs.
--
-- ⚠️  This migration is purely additive: it only ADDs a nullable jsonb column and
--     UPSERTs config rows. It never drops or renames anything. The app currently
--     resolves tenant config from the in-code registry (packages/shared/src/tenant);
--     this column is the production source of truth for when you move config into
--     the database. The registry stays the fallback, so the app works with or
--     without this migration.
-- =============================================================================

-- 1) Additive column: the full tenant config blob (validated by TenantConfigSchema).
alter table public.organizations add column if not exists config jsonb;
alter table public.organizations add column if not exists slug text;
create unique index if not exists idx_org_slug on public.organizations(slug) where slug is not null;

-- 2) Seed the free-trial customer: Villas on the Ridge (Dobbs Ferry, NY).
--    Idempotent: insert if missing, else refresh identity + config.
--    The `config` here is the tenant *partial* — the app deep-merges it onto the
--    platform defaults, so only the fields that differ from default are listed.
insert into public.organizations (name, type, timezone, accent_color, plan, billing_status, slug, config)
values (
  'Villas on the Ridge', 'community_pool', 'America/New_York', '#0F7285', 'small', 'trial', 'villas',
  jsonb_build_object(
    'slug', 'villas',
    'displayName', 'Villas on the Ridge',
    'legalName', 'Villas on the Ridge Condominium Association',
    'productName', 'Villas on the Ridge',
    'organizationType', 'community_pool',
    'address', 'Dobbs Ferry, New York',
    'timezone', 'America/New_York',
    'contact', jsonb_build_object('email', 'board@villasontheridge.example', 'phone', '(914) 555-0139'),
    'branding', jsonb_build_object('monogram', 'VR', 'fontFamily', 'Inter'),
    'theme', jsonb_build_object('brand', '#0F7285', 'secondary', '#28323E', 'accent', '#C89B6C',
                                'radius', 'soft', 'density', 'comfortable', 'defaultScheme', 'light'),
    'features', jsonb_build_object('lessons', false, 'community', false),
    'roleLabels', jsonb_build_object('org_admin', 'Board', 'ops_manager', 'Pool Manager',
                                     'hr_coordinator', 'Membership', 'head_lifeguard', 'Head Guard'),
    'operations', jsonb_build_object('poolHours', '9:00 AM – 8:00 PM', 'seasonStart', '05-24',
                                     'seasonEnd', '09-07', 'maxGuestsPerMember', 2, 'reservationSlotMinutes', 45)
  )
)
on conflict (slug) do update
  set name = excluded.name,
      config = excluded.config,
      accent_color = excluded.accent_color,
      updated_at = now();

-- 3) Tag the existing demo org (if present) with its slug so it resolves too.
update public.organizations
   set slug = 'tidetown'
 where slug is null and name = 'Tide & Town Aquatics';

-- Done. To store a full config exported from the admin UI (Branding & Modules →
-- Advanced → "Download full config JSON"), replace the jsonb_build_object above
-- with that JSON, or: update public.organizations set config = '<json>'::jsonb where slug = '...';
