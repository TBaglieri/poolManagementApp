# HANDOFF.md — White-label / multi-tenant work

Run unattended on 2026-07-21. Everything below is committed to `main` (small,
logically grouped commits). No branches are waiting on your approval. No
destructive or auth/RLS migrations were run. See `DECISIONS.md` for every judgment
call and `AUDIT.md` for the pre-work codebase audit.

**TL;DR:** the app is now a real white-label product. One codebase; every pool is a
config record. The trial deployment is branded **Villas on the Ridge** with a calm
"Hudson Slate & Water" theme, its own feature set (swim lessons + community network
turned off), and role labels ("Board", "Pool Manager"). There's a full admin UI to
theme/toggle/onboard pools without touching code. Typecheck clean, **105 tests
pass**, production build succeeds, and the core behavior is runtime-verified.

---

## What I completed, per phase

### 1. Audit → `AUDIT.md`
Framework, routing, styling, data model, auth, and a full inventory of hardcoded
colors/names/toggles. Key finding: the data layer was **already multi-tenant on
Organization** (`organization_id` everywhere, RLS-enforced), so tenant = organization
and this work layered on additively.

### 2. Plan → `DECISIONS.md`
Architecture for tenant resolution, theming, and the module system, plus every
decision made alone.

### 3. Tenant config + theming + flags foundation (`packages/shared/src/tenant/`)
- **Typed config** (`schema.ts`, Zod): identity, branding, copy, feature flags,
  operations, theme, role labels. Malformed config fails loudly at load.
- **Defaults + deep-merge resolver** (`defaults.ts`, `resolve.ts`): a tenant needs
  only a name + color to get a complete, good-looking site.
- **Accessible palette generation** (`theme.ts`): derives a full 50–950 scale from a
  brand hex, verifies WCAG AA on text-on-surface pairs, auto-darkens failing tokens,
  and returns warnings for the admin UI.
- **Module/feature-flag registry** (`modules.ts`, `flags.ts`): ~24 modules with
  sub-features; `isModuleEnabled` / `isFeatureEnabled` shared by server + client.
- **Preset themes** (`presets.ts`): Hudson Slate & Water (Villas default) + Coastal,
  Modern Navy, Warm Resort, High-Contrast.
- **Registry** (`registry.ts`): `default`, `tidetown`, `villas` config records.
- **Role labels** (`roles.ts`): per-tenant display labels, fixed permissions.

### 3b. Wired into the web app
- Tailwind `brand`/`navy` scales + radii now resolve to **CSS variables**; defaults
  in `globals.css` equal the original palette (the app is pixel-identical with no
  override — verified: `?tenant=default` still renders the original cyan).
- `src/middleware.ts`: resolves the tenant (query → env → subdomain → custom domain →
  default) and **enforces module gating server-side** (disabled module → redirect).
- Root layout injects theme tokens SSR (no color flash), sets per-tenant
  title/favicon/theme-color, and wraps the app in `TenantProvider` + `ThemeInjector`.
- Sidebar/app-shell read tenant identity, gate nav + routes by enabled modules, use
  tenant role labels, and show a branded water-ripple splash.
- Light/dark preference plumbing + topbar toggle; `prefers-reduced-motion` respected.

### 4. Theme + polish
- The Villas theme + 4 more one-click presets, all WCAG-checked.
- Branded loading (`TenantSplash`), route-level `(app)/loading.tsx` skeleton so page
  transitions never sit blank, shared `Skeleton` primitives, chart skeletons.
- Shared `Button` already had loading/hover/active/focus states; `globals.css` now
  adds active-press motion, `focus-visible` rings, and a shimmer skeleton.

### 5. Admin UI → `/settings/branding` ("Branding & Modules")
Live-preview editor: presets, brand colors + derived-scale preview, radius/density/
scheme, per-module + sub-feature toggles, identity/copy/operations, logo upload,
role labels, WCAG contrast readout, export/import config JSON, and a **"onboard a
new pool"** generator (name + color → registry-ready config). Gated to
`settings.manage`.

### 6. Seed + docs
- `supabase/tenant-config.sql`: **additive** migration (adds an `organizations.config`
  jsonb column + `slug`, upserts the Villas config). Safe/idempotent; **not run**.
- `ONBOARDING.md`: two ways to add pool #2 in < 15 minutes.
- The bundled demo store (a full season of readings, staff/shifts, chat threads) is
  the operational demo data, now presented under Villas branding.

---

## What I tested and how
- **Unit/logic (vitest, 105 pass, was 39):** color math + WCAG extremes; palette
  auto-adjust; every preset's brand-700 clears AA; Villas documented contrast pairs;
  deep-merge + malformed-config rejection; default stays pixel-identical; feature
  flags + route gating + sub-features; role-label overrides; registry resolution;
  and a **data-isolation test** that parses the real schema + RLS SQL and asserts
  every tenant-scoped table is org-isolated (plus config non-bleed between tenants).
- **Typecheck:** `tsc --noEmit` clean.
- **Production build:** `next build` succeeds; middleware registered (44.5 kB).
- **Runtime (curl against `next start`):** Villas renders the Hudson teal + correct
  title/favicon; `?tenant=default` stays original cyan; `?tenant=tidetown` resolves;
  **server-side module gating works** (Villas `/lessons` → 307 → `/dashboard`, while
  `/lessons?tenant=default` → 200); admin route reachable.

---

## Second pass — gaps I went back and closed

- **DB-backed tenant config (spec §1) is now wired.** `getServerTenantConfig` reads
  `organizations.config` for an authenticated user in supabase mode and deep-merges
  it onto the registry, with graceful fallback to the registry on any error (missing
  column, RLS, network). It's **auth-gated** — anonymous/demo requests skip the DB
  entirely, so the branded login page still renders in ~45 ms. The admin "Save" now
  also best-effort persists to the org's `config` column (RLS-scoped) in addition to
  localStorage. Registry remains the fast pre-auth source of truth.
- **Dedicated Villas demo seed (spec §8):** `supabase/seed-villas.sql` — a realistic
  single-facility dataset (1 pool, a 6-person roster, a week of shifts, **60 days of
  chemical readings**, 3 chat channels + threads, maintenance issues, hourly patron
  counts). Additive + idempotent (keyed on slug/facility). Not run — apply it in the
  SQL editor for a supabase-mode Villas walkthrough.
- **Live cross-tenant isolation test (spec §7):** `supabase/tenant-isolation.test.sql`
  creates two throwaway orgs/users, impersonates one via the JWT claim, asserts it
  sees only its own org's rows (raises on a cross-tenant leak), and ROLLBACKs. Runs
  by hand in the SQL editor; complements the static RLS-coverage vitest.
- **Broader dark mode:** added `dark:` variants to the shared primitives most pages
  use (StatCard, DataTable, Modal/Drawer, EmptyState, PageHeader, SectionCard, Tabs)
  on top of the shell + `.card`/`.input`/`.btn` coverage, so dark mode reads
  coherently across the app.

## What's still incomplete or shaky (honest list)
1. **Dark mode: primitives + shell are covered, not every inline color.** Feature
   pages with literal `bg-white`/`text-slate-900` inside a page (not via the shared
   primitives) may still show a light patch in dark mode. Tenants default to light so
   the Villas demo is unaffected. Remaining work is a mechanical `dark:` sweep.
2. **The admin UI wasn't click-tested in a browser** (no interactive session here).
   Logic typechecks + builds and the route renders; please do a 5-minute manual pass:
   Settings → Branding & Modules → change a color / toggle a module → Save.
3. **DB config write is untested against a live authenticated admin.** The read path
   is verified (falls back cleanly); the write path is best-effort and RLS-guarded but
   only fires for a real signed-in admin whose org row has a matching `slug`
   (run `tenant-config.sql` first so the `slug`/`config` columns exist).
4. **`reservations` and `guestPasses`** modules exist in the registry (so the flag
   system is complete) but ship no UI — marked "Soon" in the admin and disabled.
5. **Live SQL isolation test is version-sensitive** (inserts into `auth.users`); the
   column set may need a tweak on some Supabase versions (noted in the file).
6. Pre-existing gaps I did **not** touch (out of scope): real Stripe, file-upload to
   storage, email/SMS, some CSV exports. Authorization remains UI-level in the app
   with RLS as the real boundary — unchanged.

## Branches waiting on you
None. All work is on `main`. The only migration (`supabase/tenant-config.sql`) is
additive and was intentionally **not** run — apply it yourself when you want tenant
config in the DB.

---

## Run it locally

```bash
# Install (root workspaces)
npm install

# Dev server (defaults to the Villas tenant)
npm run dev:web
#   → http://localhost:3000  (login/landing)
#   → http://localhost:3000/dashboard

# See a different tenant without any config change:
#   http://localhost:3000/dashboard?tenant=default     (original cyan look)
#   http://localhost:3000/dashboard?tenant=tidetown     (demo org)
#   http://localhost:3000/dashboard?tenant=villas       (the trial customer)

# The white-label admin:
#   http://localhost:3000/settings/branding   (sign in as an admin/super admin first)

# Verify everything
npm run typecheck
npm test            # 105 tests
npm run build:web
```

**Demo data / seed:** the app ships with a full bundled demo dataset (mock mode) —
no seed step needed to walk a board through it. For the Supabase path, the schema +
RLS + seed are already applied (per PROGRESS.md); to add tenant config in the DB run
`supabase/tenant-config.sql` (additive).

**Pin a single-tenant deployment:** set `NEXT_PUBLIC_TENANT=villas` (already the
default), or point `villas.yourdomain.com` at the app — the subdomain resolves it.
