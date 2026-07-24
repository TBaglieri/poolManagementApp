# FEATURE_AUDIT.md — end-to-end functional audit

_Audited 2026-07-24. Method: traced the actual data flow for each feature —
component → store (`useDemo`) → repo (`repos.*`) / static seed (`useTenantSeed`) —
plus targeted runs. This is an honest map, not an optimistic one._

## How data actually flows (read this first — it explains most statuses)

There are **two data modes** (`NEXT_PUBLIC_DATA_MODE`):

- **mock** (local dev): the in-memory `useDemo` store is the source of truth. It is
  **not** persisted — a refresh resets it (real tenant → empty, demo tenant →
  re-seeded). So "round-trips across a refresh" is a Supabase-mode property, not a
  mock-mode one.
- **supabase** (production / the real customer): `SupabaseHydrator` loads a **subset**
  of slices from the DB on mount, and some store actions **write through** to repos.

**Two structural facts drive most of the gaps below:**

1. **Write-through is partial.** These actions persist to Supabase: chemicals,
   time-off (create/review), trades (create/review), shift assign/pick-up, time
   clock, maintenance, chat. These are **store-only** (lost on refresh even in
   supabase mode): **facilities, pools, checklist templates & completions, patron
   counts, shift reports, onboarding steps, published-draft shifts, notifications-read.**
2. **Reference data is not read from Supabase.** `SupabaseHydrator` hydrates
   messages/channels/chemicals/issues/notifications/clock only. **Facilities, staff,
   pools, certifications, lessons, members, documents, inspections come from
   `useTenantSeed` — demo data or empty — never from the DB.** So a real tenant's
   facilities/staff created in the DB won't appear until this is wired. (This is the
   deeper version of the facility bug; see §Known bug.)

Neither is a per-page bug — they're at the data layer, which is where I verified.

---

## Known bug — Chemical Logs can't see a created facility → FIXED

**Root cause (also in AUDIT.md §7):** the Facilities screen wrote a new facility to
its own **local `useState`**, not any shared store. Every other screen (Chemical
Logs, the facility switcher, checklists, schedules) reads facilities from
`useTenantSeed()`, which was **static** (demo data or empty) with no runtime add
path. So a created facility existed only inside the Facilities component and vanished
on navigation/refresh. A second latent bug: `chemFlags` resolved chemical ranges from
the **static seed**, so a reading on a created facility would never be flagged
out-of-range.

**Fix:** facilities + pools now live in the shared store (`useDemo`), with
`addFacility()` (which also creates a default "Main Pool" so logging works
immediately). `useTenantSeed()` overlays store facilities/pools, so a created
facility appears **everywhere** — chem logs selector, switcher, pool-safety, history.
`addChemicalLog` now resolves ranges from the store facility (then seed, then
defaults), so out-of-range detection works for created facilities. Covered by
`store-integration.test.ts`.

**Single-facility auto-select → IMPLEMENTED** (`lib/facility-select.ts`, driven off
`facilities.length`, no hardcoding): the facility switcher already collapses to the
pool name for one facility; Chemical Logs now **hides the facility picker** in the log
modal and the trend chart when there's exactly one facility, auto-attaching the
reading. Multi-facility is unchanged. Extending the same helper to the checklist,
shift-report, and schedule forms is a small, listed follow-up.

---

## Tenant features

### Team

| Feature | Status | Tested / Notes |
| --- | --- | --- |
| **Schedule** | Working (in-session) | Assign, pick-up, open-shift, coverage all round-trip via store; assign/pick-up write through to Supabase. Manager & guard (My Shifts) views both render. |
| **Auto Builder** | Working (in-session) | Generates a draft from the scheduling package honoring availability/certs; draft → publish creates shifts. **Gap:** published shifts are store-only (no per-shift Supabase persist). |
| **Schedule Drafts** | Working (in-session) | Create/edit/publish drafts in store. Store-only. |
| **Time Clock** | Working | Clock in/out + breaks; store + Supabase write-through. Tested staff→shift→clock in `store-integration.test.ts`. |
| **Staff** | Partial / reference-only | Reads `useTenantSeed().staff` — demo or empty. **No path to create a staff member into the store in mock**, and staff aren't hydrated from Supabase. Real staff arrive via invites (see Users & Access). |
| **Onboarding** | Partial | `setOnboardingStep` updates the store; **not** written through to Supabase. UI works, persistence in prod does not. |
| **Certifications** | UI only | Local `useState` seeded from reference data; add/edit not wired to store or repo. |

### Operations

| Feature | Status | Tested / Notes |
| --- | --- | --- |
| **Facilities** | Working (fixed) | Create persists to store + round-trips everywhere. **Gap:** no Supabase write-through (no facilities repo) — documented follow-up. |
| **Chemical Logs** | Working (fixed) | Log → history, "readings today", out-of-range alerts, trend, pool-safety, dashboard compliance all read the same store data, grouped by taken-at. Supabase write-through on create. |
| **Checklists** | Working (in-session) | Admin create/edit/archive templates + "import examples"; guard completes; completions show in history + dashboard. **Gap:** store-only (no Supabase write-through). Single-facility picker not yet auto-hidden here. |
| **Maintenance** | Working | Create/status/assign; store + Supabase write-through. |
| **Shift Reports** | Working (in-session) | File + manager review round-trip in store. **Gaps:** store-only; and a maintenance concern in a report does **not** auto-create a Maintenance issue (the "filed from a shift report → maintenance board" link is not implemented). |
| **Inspections** | UI only / reference | Reads `useTenantSeed().inspectionResults` (demo/empty). No create-into-store path. Module is **off** for Villas. |
| **Patron Counts** | Working (in-session) | `addPatronCount` → store → chart/reports. Store-only. Module **off** for Villas. |

### Communication

| Feature | Status | Tested / Notes |
| --- | --- | --- |
| **Team Chat** | Working | Post/pin messages; store + Supabase write-through; channels hydrate from Supabase. **Not verified:** new-staff auto-add to all-staff channel (see integration gaps). |
| **Documents** | UI only / reference | Reads seed documents; upload is not wired to storage/store. |
| **Announcements** | Working | All-staff channel messages surface on the dashboard + chat. |

### Finance

| Feature | Status | Tested / Notes |
| --- | --- | --- |
| **Payroll** | UI only | Local `useState`; computes a display from reference timesheets. Not wired to real time-clock data end-to-end; export buttons are placeholders. |
| **Reports** | Working (display) | Renders from store data (patron, shifts, coverage). Read-only; correct when underlying data exists. |
| **Billing / Invoices** | Stub | Stripe not wired (`STRIPE_*` placeholders). UI only. |

### System

| Feature | Status | Tested / Notes |
| --- | --- | --- |
| **Users & Access** | Partial | Invite/reset/role flows call `repos.admin` (Supabase) and work in supabase mode; in mock they're UI-only. Server-side role checks exist on the admin API routes. |
| **Branding & Modules** | Working | Edits persist via the tenant config provider (localStorage overrides), apply app-wide live. |
| **Settings** | Working | Reads/writes tenant config; module toggles reflected in nav + server-side gating (middleware). |
| **My Account** | Working (supabase) | Change-password uses Supabase auth (own-account only). No-op in mock. |

---

## Platform features

| Feature | Status | Notes |
| --- | --- | --- |
| **Landing / marketing** | Working | Renders platform brand; not tenant-scoped. |
| **Root login** | Working | Membership-driven routing fixed earlier (see AUDIT.md §6). |
| **Tenant provisioning** | Partial | `seed-villas` + `create-admin` scripts provision a tenant/admin against Supabase. No in-app self-serve provisioning UI (the `/setup` flow is minimal). |
| **Platform admin** | Not implemented | No dedicated platform/super-admin console beyond tenant screens. |

---

## Cross-feature integration points (the "big one")

| Integration | Status |
| --- | --- |
| Facility → chem logs / checklists / schedules / shift reports / switcher | **Fixed** (store overlay). Tested. |
| Staff onboarded → Staff list / assignable / clock in / Users & Access / chat channel | **Partial** — no mock create-staff path; auto-add to all-staff channel **not verified/likely missing**. |
| Shift scheduled → My Shifts / coverage / time clock / payroll | **Works** for My Shifts + coverage + time clock; **payroll** link is not real. |
| Chemical reading → history / trend / today / out-of-range / compliance | **Works**, grouped by taken-at. |
| Checklist created → runnable by guard → history + dashboard | **Works** (in-session). |
| Maintenance filed from a shift report → maintenance board | **Not implemented** — shift-report maintenance notes are free text only. |
| Deactivate staff → access removed everywhere, history preserved | **Not implemented** as a flow in mock; relies on Supabase RLS + status in prod (unverified here). |
| Dashboard widgets reflect the same source as detail pages | **Works** — both read `useDemo`; the dashboard Readiness/Needs-you and detail pages share the store. |

---

## Scoping, permissions, module flags, states

- **Tenant scoping / demo leakage:** real tenants get empty store slices + empty
  `useTenantSeed`; demo data loads only in the gated demo tenant. Facilities now flow
  through the same tenant-scoped store. In supabase mode, RLS is the query-layer
  boundary. **No cross-tenant read path was found in this audit.**
- **Permissions server-side:** admin API routes (`/api/admin/*`) check roles; the
  `(app)` layout enforces tenant membership server-side (AUDIT.md §6). UI also gates
  by permission. **Not exhaustively pen-tested per endpoint** — flagged for a
  dedicated security pass.
- **Module flags:** disabled modules are absent from nav **and** blocked server-side
  by middleware (`isPathEnabled`). Verified for Villas (lessons/inspections/patron
  counts off).
- **Empty/loading/error states:** present on the audited screens; the design pass
  turned the prominent empties into actionable invitations. A few async panels still
  lack skeletons (listed in DESIGN.md).

---

## Fixed in this pass

- Facility → Chemical Logs round-trip (store-backed facilities/pools + `addFacility`).
- Out-of-range detection for runtime-created facilities.
- Single-facility auto-select (chem logs + switcher), off facility count.
- Tests: `facility-select.test.ts`, `store-integration.test.ts` (facility→chem,
  staff→shift→clock, checklist→completion).

## Prioritized follow-ups (not done — with rough size)

1. **Wire reference data + non-write-through writes to Supabase** (facilities, pools,
   staff, checklist templates/completions, patron counts, shift reports, onboarding,
   published shifts). This is the big one for a real customer — **M–L**. Add a
   `facilities` repo + hydrate facilities/staff in `SupabaseHydrator`.
2. **Shift-report maintenance note → Maintenance issue** auto-create — **S**.
3. **Staff lifecycle in mock** (create/onboard/deactivate into store) + auto-add to
   all-staff channel — **M**.
4. **Extend single-facility auto-select** to checklist / shift-report / schedule forms
   (helper already exists) — **S**.
5. **Payroll** wired to real time-clock data; **Billing** to Stripe — **M each**.
6. **Per-endpoint permission pen-test** — dedicated security pass — **M**.
