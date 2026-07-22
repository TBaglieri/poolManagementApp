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

## 5. Known pre-existing gaps (not introduced here, noted for honesty)

- Authorization is UI-level in the app; RLS is the real boundary. This work does not change auth/RLS (per the "don't push destructive/auth changes while away" rule).
- Some CSV export buttons are placeholders.
- Billing is not wired to real Stripe.
- `.env.local` historically mislabeled a secret key — see memory; unchanged here, not touched.

See `DECISIONS.md` for the architecture chosen and every judgment call made while running unattended.
