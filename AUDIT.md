# AUDIT.md — Codebase audit for white-label / multi-tenant work

_Audited by Claude on 2026-07-21, before any code changes, per the brief in
`pool-app-claude-code-prompt.md`. Read this first when you get back._

---

## 1. Framework, stack, and structure

| Area | What it is |
| --- | --- |
| Monorepo | npm workspaces. Root `package.json` → `apps/web` + `packages/*`. `apps/mobile` is a **separate** Expo project (its own `node_modules`, **not** a workspace member). |
| Web framework | **Next.js 14.2.18**, App Router, React 18.3.1, TypeScript 5.5. |
| Styling | **Tailwind CSS 3.4** + a small set of `@layer components` classes in `globals.css` (`.card`, `.btn-*`, `.input`, `.chip`). `clsx` + `tailwind-merge` via `lib/cn.ts`. |
| State | **Zustand**. Two stores: `lib/session.ts` (who am I / role / mode, persisted to localStorage) and `lib/store.ts` (`useDemo` — the in-memory operational data, seeded from bundled demo data). |
| Charts | Recharts 2.12 (lazy-loaded). |
| Icons | lucide-react, resolved by name through `components/ui/icon.tsx`. |
| Data model | `packages/shared/src/types/index.ts` — the **single source of truth** domain model for web + mobile. |
| Seed data | `packages/shared/src/data/seed.ts` — a full fictional org, **"Tide & Town Aquatics"**, 4 facilities, staff, a season of readings, shifts, chat, etc. |
| RBAC | `packages/shared/src/rbac/` — 12 roles, ~55 permission keys, role→permission map, per-staff overrides, nav definition. |
| Scheduling engine | `packages/scheduling` — deterministic auto-scheduler (pure, unit-tested). |
| Backend | Supabase. SQL in `supabase/` (`schema.sql`, `rls-policies.sql`, `realtime.sql`, `storage.sql`, `seed.sql`). Per `PROGRESS.md` + memory: schema + RLS + seed are **applied and verified** on the live project. `NEXT_PUBLIC_DATA_MODE=supabase` in `.env.local`. |
| Data access | `apps/web/src/lib/repos/` — a repository layer with **mock** and **supabase** implementations and graceful fallback (`selectOr`/`insertOr`/`updateOr`). Mode chosen by `NEXT_PUBLIC_DATA_MODE`. |

### Routing
- App Router. `app/(app)/*` is the authenticated dashboard (route group with `AppShell`). ~30 feature routes (dashboard, schedule, chemicals, time-clock, staff, chat, documents, payroll, reports, settings/*, etc.).
- `app/m/*` is a **web** "mobile preview" surface (touch layout), not the native app. Left untouched by this work.
- `app/login`, `app/setup`, `app/pricing`, `app/quote`, `app/accept-invite/[token]` are public/marketing/onboarding.
- One API route: `app/api/admin/invite-user/route.ts`.
- No `middleware.ts` existed before this work.

### Auth
- `lib/auth.ts` wraps Supabase email/password auth (browser anon client only). In mock mode it's a no-op and the app uses a **demo role switcher**.
- `lib/session.ts` holds `mode: "demo" | "real"`, `role`, `staffId`, `facilityId`, persisted to localStorage. `AppShell` redirects to `/login` if no role, and `/setup` if a real user has no org.
- **Authorization today is UI-level** (`can()` / `PermissionGate` / nav filtering). The intent is that Supabase **RLS** is the real enforcement boundary (see `rls-policies.sql` and `SECURITY.md`). The one API route enforces a server check.

---

## 2. The tenant model that already exists

**Good news: the data layer is already multi-tenant.** The white-label "tenant" maps cleanly onto the existing **Organization**:

- `types/index.ts` has an `Organization` interface (`id, name, type, timezone, seasonStart, seasonEnd, accentColor, logoUrl?, plan`).
- `supabase/schema.sql` has an `organizations` table (with `accent_color`, `logo_url`, `plan`, `billing_status`) and **`organization_id` on essentially every domain table** (facilities, staff, shifts, chemical_logs, messages, documents, …).
- `rls-policies.sql` enforces org isolation.
- A `Facility` belongs to an `Organization` (`orgId`). One org can have many facilities (the demo org has 4). So the hierarchy is **Organization (tenant) → Facilities → Pools**.

**Gap:** the org record only carries a single `accentColor` + optional `logoUrl`. There is no rich branding, no typed copy, no per-tenant **feature flags**, no theme system, and no admin UI to edit any of it. That is exactly what this project adds — layered on top of the existing org model, additively.

---

## 3. Everything hardcoded that must move into tenant config

| Hardcoded thing | Where | Plan |
| --- | --- | --- |
| Brand color scale (cyan/teal `brand.*`) and `navy.*` | `tailwind.config.ts` (hex literals) | Repoint Tailwind `brand`/`navy` to **CSS variables**; inject per-tenant values from config. Default values = today's exact hex, so nothing changes visually until a tenant overrides. |
| App/product name "PoolOps Pro" | `brand.tsx` (Logo), `app/layout.tsx` metadata, several pages/marketing | Read product/tenant display name from tenant config; keep "PoolOps Pro" as the platform default. |
| Org name/type "Tide & Town Aquatics" | imported `organization` seed used in ~17 files (`sidebar`, `topbar`, `login`, `dashboard`, `settings`, …) | Sidebar/header now read **identity from tenant config**; seed org kept only for data relationships. |
| `themeColor: "#0E7490"` | `app/layout.tsx` viewport | Driven from tenant primary color. |
| Brand gradient `from-brand-400 to-brand-700`, `text-brand-500` | `brand.tsx` | Now resolves through the tokenized `brand` scale. |
| Chemical target ranges (`STD_RANGE`) | `seed.ts` per facility | Already per-facility in the model; also exposed as a tenant-config **operational default**. |
| Status/severity colors, chart series colors | chart components, some pages (Recharts needs literal colors) | Key brand-driven chart colors read from CSS vars; semantic status colors (rose/amber/emerald) intentionally stay as neutral semantic tokens (documented in DECISIONS.md). |
| Role display names | `rbac/roles.ts` | Base names stay; tenant can **override role labels** ("Board" vs "HOA Committee") via config. |
| "Feature toggles" | **None existed.** Plan tiers (`pricing.ts`) gate marketing copy but nothing disables a module at runtime. | New per-tenant **module feature-flag** system. |

There are **no `if (tenant === 'x')` branches** anywhere — good; the codebase never forked per customer.

---

## 4. Verified feature inventory (what actually works)

Verified by reading the code paths + running the existing test suite (**39 tests pass**, typecheck clean) before touching anything. These are demo-functional (operate on the seeded Zustand store; a subset write-through to Supabase in supabase mode):

| Feature | State | Notes |
| --- | --- | --- |
| Auth / role switcher | ✅ Works | Real Supabase auth in supabase mode; demo role switcher in mock. |
| Dashboard | ✅ Works | Role-aware widgets. |
| Staff scheduling (view, auto-builder, drafts, publish, assign, pick-up, trades, time-off) | ✅ Works | Most mature module. Writes-through to Supabase for shift updates/trades/time-off. |
| Time clock + payroll (clock in/out, breaks, CSV export) | ✅ Works | Clock write-through to Supabase. |
| Chemical logs (record, range flags, pool-closure alert) | ✅ Works | Create write-through to Supabase. |
| Maintenance issues (report, status, assign) | ✅ Works | Create + update write-through. |
| Chat / announcements | ✅ Works | Post write-through to Supabase. |
| Staff directory, onboarding, certifications | ✅ Works | Mock-backed. |
| Checklists, inspections, patron counts, shift reports | ✅ Works | Mostly mock-backed. |
| Documents, lessons, members | ✅ Works (read) | Mock-backed lists. |
| Reports | ✅ Works | Charts render; some CSV export buttons are placeholders. |
| Settings (users, roles, permissions matrix, subscription) | ✅ Works | Permission matrix + role/permission views. |
| Billing | ⚠️ Placeholder | No real Stripe; mock invoices. |

**Decision: keep all of it.** None of it is broken or structurally blocks multi-tenancy — the org model is already the isolation seam. This work is **additive**: a tenant-config + theming + feature-flag foundation, an admin UI, the Villas theme, and an animation/polish pass. No feature logic is rewritten.

---

## 4b. Why account creation was broken (§4 diagnosis) + the fix

Diagnosed while implementing the updated §4. Three defects, root-cause first:

1. **No `profiles` row is created on sign-up (the root cause).** `public.profiles`
   has `id → auth.users(id)`, and `organization_members.profile_id` /
   `staff_profiles.profile_id` reference `profiles(id)`. But **nothing** created a
   profile row when a user signed up — there was no `on auth.users` trigger and no
   app insert. So `auth.signUp` created the `auth.users` row, then the very next
   step (org setup's `insert organization_members(profile_id = uid)` or linking a
   staff record) hit a **foreign-key violation**. Account creation half-succeeded
   and then broke everything downstream (`current_org_id()` returned null → the user
   saw an empty/broken app). **Fix:** `supabase/auth-profile-trigger.sql` installs
   the standard `handle_new_user()` trigger (create the profile on signup, copy
   name/role from invite metadata) + backfills existing users. Additive.

2. **Invite acceptance only read the inviting browser's `localStorage`.** The accept
   page looked the invite up in the client `useInvites` store, so a guard opening the
   emailed link **on their own device** always got "Invitation not found." **Fix:** a
   token-guarded server route `GET /api/invite/[token]` resolves the invite from the
   DB (service role); the accept page uses it as a fallback, validates the invite
   state (reused / revoked / expired) and password, handles duplicate-account and
   network errors inline with the button loading state, and routes into `/dashboard`.

3. **Privilege-escalation hole in `POST /api/admin/invite-user`.** The permission
   check "fell through" and **allowed** the invite when the caller's
   `organization_members` row couldn't be read. **Fix:** deny by default — an
   unverifiable or insufficient role is now rejected (403).

Validation rules (password policy, email, invite state, bulk parsing) are pure
functions in `apps/web/src/lib/accounts.ts`, unit-tested, and shared by the UI and
the routes. Live end-to-end auth couldn't be exercised from the build sandbox (no
network egress to Supabase — `fetch failed`), so the flow is verified by unit tests +
auth-denial + graceful UI states; run it against your Supabase project after applying
`auth-profile-trigger.sql`.

## 4c. Standing up Villas on Vercel (path-based, no domain) — what changed

Changes made to existing tenant/auth code so `https://<app>.vercel.app/villas` works:

- **Tenant resolution** was extracted into a pure `resolveTenant()`
  (`packages/shared/src/tenant/resolution.ts`) and the middleware rewritten to use
  it. Host (subdomain/custom domain) stays PRIMARY; the **first URL path segment**
  is a new FALLBACK. On a path match the middleware **rewrites** `/<slug>/…` → `/…`
  and persists the tenant in the `tenant` cookie, so internal links (which are
  root-relative) keep working and moving to a subdomain later needs no app changes.
  A no-tenant result rewrites to a neutral `/unknown-facility` page. The gated demo
  is never resolvable by path/query without its access cookie.
- **Villas config** (`registry.ts`): two active roles (`org_admin` "Admin / Pool
  Manager", `lifeguard`) and a small-pool module set — chemicals, scheduling, chat,
  time clock, maintenance, checklists, staff/onboarding/certs, shift reports,
  documents, payroll, reports ON; lessons, members, reservations, guest passes,
  community, billing, inspections, patron counts OFF (all still toggleable).
- No changes to the auth/session mechanics themselves beyond the earlier §4 fixes
  (profiles trigger, invite lookup, priv-esc). The provisioning scripts
  (`seed-villas`, `create-admin`) use the service role from env and were verified
  live end-to-end (org upsert; admin user → profile → org membership → staff row;
  idempotent re-provision; cleaned up).

## 4d. Why demo data leaked into real tenants (root cause) + the fix

Three related bugs, one root cause: **the app was built demo-first.** Every page
read operational data from a Zustand store (`lib/store.ts`) that was *pre-seeded* at
import with the bundled "Tide & Town" dataset, and read reference data (facilities,
staff, certs, lessons) by importing the seed arrays from `@poolops/shared`
*directly in the component*. Nothing was tenant-scoped, so a real tenant rendered
demo facilities (Maplewood/Riverbend), demo staff (Marcus Reyes), fake coverage %,
etc. Fixes:

- **Bug 2 (demo data leak).** The store now starts **empty**; the bundled dataset
  loads **only** for the gated demo tenant, via a `seedDemo()` action driven by a
  `DemoSeeder` mounted in the shell (real tenants stay empty; Supabase hydration
  fills real data when present). Reference data now flows through `useTenantSeed()`
  (`lib/tenant-data.ts` + pure `lib/tenant-seed.ts`), which returns the demo dataset
  only for the demo tenant and **empty arrays otherwise**. The dashboard and the
  team/ops pages (staff, facilities, chemicals, time-clock, certifications,
  onboarding, payroll, documents, reports) were migrated to it, with **designed
  empty states** and guards for the `seed[0]` / divide-by-zero crashes that empty
  data would otherwise trigger. The hardcoded "Tide & Town" fallback in
  `user-context.ts` and the `org_tidetown` id in the facilities add-form were removed.
- **Bug 1 (login didn't route to the tenant).** After sign-in, `resolveUserTenant()`
  (`lib/tenant/user-tenant.ts`) reads the user's active org membership and maps it to
  a tenant slug (org `slug` column, or display-name→registry fallback); login then
  routes to `/<slug>/dashboard` and stores the real profile name + org on the
  session. Identity now comes from the real user (`useDisplayName()`) + tenant config
  (`displayName`), never a demo staff or hardcoded org name.
- **Bug 3 (mobile preview in real tenants).** The "Mobile preview" nav item is
  flagged `demoOnly` and filtered out of real tenants' sidebars, and the `/m/*`
  routes are blocked server-side in middleware for any non-demo tenant.

Tests added: real-tenant emptiness + no demo names + empty store (`tenant-leak.test.ts`),
org-name→slug mapping (Bug 1), and demo-only nav filtering (Bug 3). Follow-up (now
done — see §4e): linking staff auth accounts to their `staff_profiles` row.

## 4e. Why staff self-service didn't work (auth→staff link) + the fix

**Root cause.** RLS already keys every self-service feature off `current_staff_id()`
— the `staff_profiles` row whose `profile_id = auth.uid()` (see `rls-policies.sql`:
shifts, shift_trade_requests, time_off_requests, time_clock_entries all scope reads/
writes to it). The link *column* existed (`staff_profiles.profile_id → profiles.id
== auth.users.id`), but **nothing ever wrote it for an invited guard**: invite
acceptance created the auth user (+ profile via the signup trigger) and stopped
there — no `staff_profiles` row, no `organization_members` row. So `current_staff_id()`
resolved to NULL and My Shifts / clock-in / per-person attribution had no identity to
hang on. There was also no uniqueness guarantee on the link.

**Where the link is now created.**
- **Data model** (`supabase/staff-auth-link.sql`, folded into `_run_all.sql`): adds
  `staff_profiles.email` (so an invite can reserve a row before the auth account
  exists, and the backfill can match by email in-tenant); a **UNIQUE index on
  `(organization_id, profile_id)`** so one auth account maps to at most one staff
  profile per tenant (plain unique index — NULLs distinct — so any number of reserved
  rows with `profile_id NULL` coexist; created *before* any upsert uses it as an
  ON CONFLICT arbiter, avoiding the 42P10 partial-index pitfall); and org-scopes
  `current_staff_id()` so a multi-tenant user resolves to the right org's row.
- **Onboarding time** (the important part). Invite (`/api/admin/invite-user`) now
  **reserves** a staff row (`reserveStaffProfile`, `profile_id NULL`). Acceptance hits
  the new server route **`/api/invite/accept`** which verifies the accepting user's
  email matches the invite, upserts org membership, and **links** the reserved row —
  writing `profile_id` onto it (`linkStaffProfile`), or creating a linked row if none
  was reserved. Both orderings are handled with no race that leaves an account
  unlinked. Provisioning logic lives in `apps/web/src/lib/server/staff-provisioning.ts`;
  the pure email-matching rules are in `packages/shared/src/staff/link.ts`.
- **Backfill** (`scripts/link-staff-profiles.ts`, `npm run link-staff-profiles`):
  matches existing org members to unlinked staff rows by email within each tenant and
  writes the id. Idempotent (skips already-linked), supports `--dry-run` / `--tenant`,
  reports counts and flags anything it can't match.
- **Client resolution + fail-loud.** `resolveUserTenant()` now also returns the user's
  `staffId`/`staffLinked`; login and invite-accept store it on the session. A staff
  user who signs in with **no** linked profile gets the `UnlinkedStaffNotice` ("your
  staff profile isn't set up — contact your admin") plus a console warning, instead of
  a silently-empty My Shifts. Server enforcement is unchanged and correct: RLS already
  restricts everything to `current_staff_id()`, which now actually resolves.

Tests: pure link/matching logic incl. tenant isolation + idempotency
(`packages/shared/src/staff/link.test.ts`), the fail-loud predicate
(`apps/web/src/lib/staff-link.test.ts`), and a `current_staff_id()` self-resolution +
no-cross-tenant assertion in `supabase/tenant-isolation.test.sql`.

## 4f. Tenant branding assets — how they're stored and resolved

White-label rule kept throughout: **a tenant's brand assets live in that tenant's
config**, never hardcoded globally. `BrandingSchema`
(`packages/shared/src/tenant/schema.ts`) gained `icon`, `ogImage`, `appleTouchIcon`
(all optional, per-tenant).

- **Icon-only mark** (`branding.icon`). Either `"inline:<id>"` — a built-in vector
  mark from `packages/shared/src/tenant/brand-icons.ts` (Villas = `inline:houses`, a
  row of townhouses in line art) — or an asset URL. Inline marks are pure path data
  shared by three renderers so the brand is identical everywhere: the React
  `TenantMark` (home button/sidebar), the favicon data-URI (`theme-css.ts`), and the
  social card. They're vector, so crisp from 16px to 1200px, and inherit the theme
  color. A raster asset (`branding/villas-houses.svg` ships as a static fallback; drop
  a PNG and point `branding.logoLight`/`branding.icon` at it — see
  `apps/web/public/branding/README.md`).
- **Home button** (`components/shell/topbar.tsx` → `TenantHomeButton`). Renders
  `TenantMark` + `config.displayName`, links to the tenant home — every tenant gets
  its own icon + name automatically, sourced from config.
- **Link previews.** `tenantMetadata()` (`lib/tenant/metadata.ts`, pure/tested) builds
  Open Graph + Twitter tags from config (og:title = displayName, og:description =
  tagline, og:url = tenant URL, og:image = the tenant's card). The root layout calls
  it with the request origin + resolved slug, so the tags resolve for **whichever
  tenant the URL belongs to** — pool #2 unfurls with its own name/image. The card is a
  1200×630 image generated per-tenant by `app/api/og/[slug]/route.tsx` (next/og), or a
  static `branding.ogImage` if the tenant supplies one. Favicon + apple-touch icon come
  from the same mark, so tab, home button and unfurl are one brand. (Note: the OG
  *image* rendering is verified by build only here; the meta tags are unit-tested and
  standards-compliant — some email clients strip OG tags, iMessage/modern webmail use
  them.)
- **Share / invite.** Branding admin → "Share & Invite" tab (`components/settings/
  share-links.tsx`): a copyable, tenant-isolated portal link (`/<slug>/login`) plus a
  pointer into the existing role-invite flow (single-use, expiring tokens that
  provision + link the staff profile per §4e). A share link never grants access to
  another tenant.

**Villas artwork (real assets wired in).** The supplied townhouse line-art logo was
processed (Pillow) into the derived assets the app needs, keeping the brand identical
across tab, home button and link-preview:
- Row-density analysis found three content bands — houses (icon), the "Villas on the
  Ridge" wordmark, and a "**Community Icon**" placeholder line — and the placeholder
  band was **cropped off** (never shipped).
- Faint generator noise was removed (kept only dark, opaque line-art + its anti-aliased
  edges), producing clean transparent cutouts: `villas-logo.png` (full lockup) and
  `villas-icon.png` (houses only), each with a **white** dark-mode variant
  (`*-light.png`) recolored from the same alpha so `TenantMark` theme-swaps for legibility.
- Derived `villas-favicon.png` (64² white houses on the brand-teal tile),
  `villas-touch.png` (180² apple-touch), and `villas-og.png` (1200×630 social card:
  the dark lockup on a soft cream→cool-light background with a teal ridge bar).
Villas' config points `icon`/`iconDark`/`logoLight`/`logoDark`/`favicon`/
`appleTouchIcon`/`ogImage` at these files; other tenants fall back to the inline mark
/ generated favicon / `/api/og/<slug>` card. Regeneration steps live in
`apps/web/public/branding/README.md`.

## 4g. Why a real login still showed a demo user + "Local demo" chrome

**Root cause (two spots, one theme: demo was the global default, not scoped to the
demo tenant).** The effective data mode defaults to `mock` unless
`NEXT_PUBLIC_DATA_MODE=supabase` **and** the URL/anon key are set
(`packages/supabase/src/config.ts` → `getEffectiveDataMode`). In `mock` mode:

1. **The login handler fell back to demo on every tenant.** `login/page.tsx`'s
   `handleAuth` did `if (!supabaseMode) { enter("org_admin"); return; }` — so signing
   in at `/villas/login` with correct credentials **ignored them** and entered DEMO
   mode as the `org_admin` demo staff, whose name is **"Marcus Reyes"**
   (`DEMO_STAFF_BY_ROLE`). That single line is the "hardcoded current user overriding
   the real session." There is no other demo-user provider.
2. **The sync pill showed "Local demo" app-wide.** `SyncStatus` rendered the `mock`
   chip ("Local demo") whenever data mode was mock, in real tenants too.

**The DEEPER root cause (why a first pass wasn't enough): there was no auth→session
bridge.** `loginReal` was only ever called from the login / accept-invite form
submits. Nothing reconciled the Supabase auth session into the persisted zustand
`useSession` store on load — so that store (localStorage) was the sole "current user".
A stale demo identity persisted there (from any prior demo entry, or the old mock-mode
login fallback running once) kept rendering as the current user, overriding a valid
real session. And because data mode defaulted to `mock`, real auth never even ran.

**The fix.**
- **Real auth is the default when configured.** `getDataMode()` now defaults to
  `supabase` whenever Supabase is actually configured (URL + anon key), `mock` only when
  there's no backend or it's explicitly requested. Demo/mock is no longer the silent
  global default. (`packages/supabase/src/config.ts`.)
- **Auth→session bridge** (`components/shell/supabase-session-sync.tsx`, mounted in the
  shell). On a real tenant in supabase mode it makes the Supabase session the source of
  truth: a signed-in user establishes/refreshes the real session (`resolveUserTenant` →
  real name/role/org + linked staff id via `applyRealSession`); **no** session clears
  any persisted identity (`invalidateSession`) so the shell redirects to login — never a
  demo user. The shell waits for this reconciliation (`authResolved`) before trusting the
  persisted session, so a stale demo identity can't flash or stick.
- **A demo session is only valid in the demo tenant.** `requiresLoginRedirect` now
  redirects to login when a `mode:"demo"` session is on a real tenant (defense in depth,
  covers mock mode too). The app shell splash shows until a real session resolves.
- **Demo login is scoped to the demo tenant only.** `login/page.tsx` `handleAuth` only
  allows the seeded-role fallback when `isDemoTenant`; a real tenant always attempts real
  auth and, if unconfigured, shows a clear error instead of entering a demo user.
- **Demo chrome is gated on the demo tenant.** `SyncStatus` no longer renders the "Local
  demo" chip outside the demo tenant (Demo badge + role switcher were already gated).
  Pure predicates in `lib/demo-mode.ts` (`allowsDemoLoginFallback`, `showsLocalDemoChip`,
  `requiresLoginRedirect`) centralize the rules and are unit-tested.

After login as `tristenbaglieri@gmail.com` on `/villas/login`, identity comes from the
Supabase session (greeting, top bar, bottom-left profile, role) — the real account, not
Marcus Reyes — with no "Local demo" chrome; sign-out / missing session redirects to
login. (Requires the deployment to carry the Supabase env vars so it runs in supabase
mode; with them present no `NEXT_PUBLIC_DATA_MODE` flag is needed anymore.)

## 4h. Why invited users became Admin (privilege escalation) + the fix

**Root cause.** The invite forms already defaulted to Lifeguard, but the identity code
**fell back to the HIGHEST role** whenever a membership role failed to resolve:
`login/page.tsx`, `supabase-session-sync.tsx`, and `user-context.ts` all did
`role ?? "org_admin"`. So any account whose `organization_members` role didn't resolve
(e.g. the accept route hadn't created the membership, or resolution briefly returned
null) was rendered — and treated by client RBAC — as an **admin**. A missing/ambiguous
role must fall back to the LOWEST privilege, never the highest.

**The fix.**
- **Least-privilege resolution** (`packages/shared/src/tenant/roles.ts`):
  `lowestPrivilegeRole(config)` (the min-`level` active role — Lifeguard for Villas) and
  `resolveAssignedRole(config, requested)` (honor an explicitly-chosen active role;
  otherwise fall to the lowest; `super_admin` is never tenant-assignable). Every
  `?? "org_admin"` fallback now uses these (or `"lifeguard"` as the universal floor).
- **Invite UI** (`invite-staff-modal.tsx`): the Role field is pre-selected to the
  tenant's lowest role, labelled "… (default)", lists only the **tenant's active roles**
  (not a hardcoded 12), and shows an inline warning when an elevated/admin role is
  chosen so granting admin is deliberate. The invited role is carried through
  invite → `/api/invite/accept` (membership `role_slug`) → session unchanged.
- **Server-enforced role changes** (`/api/admin/set-role`): admin-only, tenant-scoped
  (a non-admin or cross-tenant caller is rejected — no self-escalation), validates the
  new role against the tenant's active roles, **blocks demoting/deactivating the last
  admin**, and writes an `audit_logs` entry (actor, target, from→to). RLS reads
  membership live, so a demotion takes effect on the target's next request. Wired into
  Users & Access (per-member role selector + deactivate).
- **Data review** (`scripts/review-invite-roles.ts`, `npm run review-invite-roles`):
  report-only by default — flags accounts that are admin but whose accepted invitation
  asked for a non-admin role; `--fix` demotes ONLY those, never a provisioned admin and
  never the last admin. Your own admin account is never touched.

## 4i. Why tenant branding leaked onto platform pages + the fix

**Root cause.** `resolveTenant` (and `getTenantSlug`) fell back to the `env` deploy
default (`NEXT_PUBLIC_TENANT=villas`) — and a `tenant` cookie — on **every** route.
So platform pages (`/`, root `/login`, marketing) had no "no-tenant" state: they
resolved Villas via the fallback, and the config-driven **metadata** (tab title,
favicon, and the OG card that unfurls when the site URL is shared) rendered "Villas
on the Ridge" instead of PoolOps Pro. Branding was decided by the "last loaded /
default tenant," not by whether the route is actually tenant-scoped.

**The fix (generic — no Villas special-casing).**
- **First-class platform brand.** `PLATFORM_CONFIG` (PoolOps Pro: waves mark, platform
  tagline, base look) in `packages/shared/src/tenant/registry.ts` — a reserved
  `"platform"` slug that is NOT in the tenant registry (can't be reached as a tenant)
  and that no tenant can overwrite.
- **Branding is decided by the ROUTE.** Middleware treats a request as platform when
  there is **no real tenant signal** (`REAL_TENANT_SOURCES` = path / host / subdomain /
  query / demo — a cookie/env fallback does NOT count) **and** the path is a platform
  path (`isPlatformPath`: `/`, `/login`, marketing, `/setup`, `/accept-invite`,
  `/reset-password`, …). It then sets `x-platform: 1` and clears the tenant header, so
  `getServerTenantConfig()`/`getTenantSlug()` return `PLATFORM_CONFIG`/`"platform"`.
  A `/<slug>/…` path or tenant host is a real signal, so `/villas` and `/villas/login`
  stay tenant-branded; the authenticated app routes keep tenant context via the cookie.
- **Config-driven headers.** The marketing header and the login page now render
  `TenantWordmark` (reads the active config) instead of a hardcoded PoolOps Pro logo —
  so platform pages show PoolOps Pro and `/villas/login` shows Villas, automatically.
- **Metadata / OG / favicon follow.** `tenantMetadata` puts platform previews at the
  site root (`og:url` = origin) with `/api/og/platform` (the OG route renders
  `PLATFORM_CONFIG` for the platform slug) and the waves favicon; a tenant URL keeps
  its own name, image, and favicon. Pool #2 gets its own brand inside its tenant and
  PoolOps Pro everywhere else with no code changes.

## 5. Known pre-existing gaps (not introduced here, noted for honesty)

- Authorization is UI-level in the app; RLS is the real boundary. This work does not change auth/RLS (per the "don't push destructive/auth changes while away" rule).
- Some CSV export buttons are placeholders.
- Billing is not wired to real Stripe.
- `.env.local` historically mislabeled a secret key — see memory; unchanged here, not touched.

See `DECISIONS.md` for the architecture chosen and every judgment call made while running unattended.
