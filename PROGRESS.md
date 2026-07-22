# PoolOps Pro — Build Progress

> Running log you can check anytime. Newest entries at top of each section.

## Current status: **Phase 1 — Staff Scheduling + Approvals: swaps/subs/pick-up/approvals DONE (mock-mode, build-verified). Blocked on you: create a fresh Supabase project to prove live persistence + test RLS.**

---

## Module note: Staff Scheduling + Approvals (2026-07-13)

**What it does now (previously dead / in-memory only):**
- **Staff can request time off** — web `/schedule` (staff view) + mobile `/m/my-schedule`. Validated
  form (date order, required reason), loading + success states. Appears in the manager approval queue.
- **Staff can request a sub / swap** — pick one of your shifts, optionally name a teammate or leave it
  open to anyone, add a reason. Same validation/loading/success.
- **Staff can pick up open shifts** — the "Pick up" buttons now actually assign the shift to you
  (web + mobile). Were dead buttons before.
- **Managers approve/deny** time-off and swaps on `/schedule` and `/m/manager`. Approving a swap now
  **reassigns the shift** (to the named sub, or opens it for pick-up) instead of doing nothing.
- **Unified shift model** — shifts are one mutable store slice (`useDemo.shifts`) instead of the old
  split `seedShifts` + `publishedShifts`, so assign/pick-up/trade mutate real state everywhere
  (schedule, dashboard, m/home, m/manager, m/my-schedule).
- **Data layer + persistence** — new `updateOr()` helper; `repos.scheduling.createShift/updateShift`,
  `repos.trades.list/create/review`, `repos.timeOff.list/create/review`. Store write-through fires in
  supabase mode (fire-and-forget, consistent with existing chemicals/maintenance pattern).

**How to test (mock mode, now):** `npm run dev:web` → log in as **Lifeguard** → `/schedule` → "Request
time off" / "Request sub / swap" (submit) and "Pick up" an open shift. Then switch to a manager role
(**Ops Manager** / **Scheduling Manager**) → `/schedule` → approve/deny in "Time-off requests" /
"Shift trades"; approving a swap reassigns the shift.

**Verification level:** typecheck ✅, production build ✅ (all routes render). Interactive flow verified
by code review — **not yet driven in a browser** and **not yet proven against live Supabase** (no project).

**Assumptions / known follow-ups:**
- Manual single-shift **create/edit** UI for managers is not built yet (shifts are created via the
  Auto Builder → publish). Swaps/subs/approvals/pick-up are the completed slice.
- **Live-mode id reconciliation:** the store uses optimistic local ids; UPDATE write-through targets
  Supabase rows by id, so it only fully persists once the store reads server ids in supabase mode.
  Harmless in mock mode. Must be reconciled during live verification.
- **RLS hardening** for `shifts` / `shift_trade_requests` / `time_off_requests` is the next increment
  (Phase 2) — best done against the live project.

### Decisions locked (2026-07-13)
- **Mobile:** build the native Expo/React Native app (dedicated later phase — large effort).
- **Backend:** wire + test against **live Supabase** (real persistence proven each step).
- **RBAC:** **Supabase RLS-first** — harden the existing `supabase/rls-policies.sql`.
- **First module:** **Staff scheduling + approvals**.

### ⛔ Blocker (needs you): the referenced Supabase project no longer exists
`bqhhbekmqsmfkxyzdvol.supabase.co` **does not resolve** (DNS: name does not exist) — the project
was deleted or never persisted. General internet works from here. To use live mode we need a NEW
project. See the "Supabase setup checklist" in chat. Until then I'm building in **mock mode**
(live-ready) so nothing stalls; we flip to live and verify the moment the project exists.

### Done this session (no commit yet — mid-module)
- Rewrote root `.env.local`: fixed the `/rest/v1/` URL bug, moved the publishable key to the correct
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` var, removed the stale service-role JWT (placeholder now), set
  `DATA_MODE=mock` until a project exists. (File is gitignored; not committed.)
- Added `updateOr()` to `apps/web/src/lib/repos/db.ts` — the UPDATE path the app never had.
- Extended the repo layer for scheduling: `scheduling.createShift/updateShift`, `trades.list/create/review`,
  `timeOff.list/create/review`. Typecheck passes clean.

---

## Phase 0 — Audit findings (2026-07-13)

**Verdict:** This is a **polished, well-architected demo/prototype**, not a production app. The
code quality is genuinely good (clean monorepo, typed domain model, thoughtful RBAC map, a real
repository abstraction). But the README significantly **overstates completeness**. Most feature
"writes" live in an in-memory Zustand store and do not persist; authorization is **client-side only**;
there are **no tests**; the **mobile app is an empty scaffold**; and **push notifications, file
uploads, payments, and email/SMS do not exist**.

### What is actually real
- **Web app (Next.js 14 App Router)** — ~44 routes, all render and typecheck cleanly (`tsc --noEmit` passes).
- **Domain model & seed data** — strong: `packages/shared` has 644 lines of types, 693 lines of seed data.
- **RBAC map** — 12 roles × ~50 permissions, well-structured (`packages/shared/src/rbac`). **Client-side only.**
- **Auto-schedule engine** — deterministic generator exists in `packages/scheduling`.
- **Repository layer** — `apps/web/src/lib/repos` with mock + Supabase impls and graceful fallback.
  - Real Supabase **reads** for ~8 domains; real **create** (fire-and-forget) for 4 domains
    (chat, chemicals, maintenance, time-clock clock-**in** only).
  - **No update/delete anywhere.** Clock-out, issue status/assignment, approvals, pins, etc. are in-memory only.
- **Supabase SQL** — schema.sql, rls-policies.sql, realtime.sql, storage.sql, seed.sql exist (not verified applied).
- **Git/GitHub** — already initialized and pushed to `github.com/TBaglieri/poolManagementApp` (`origin/main`). Phase 0.5 essentially done.

### What is NOT real (despite claims)
- **Persistence** — feature pages write to the `useDemo` Zustand store, seeded from bundled data.
  Only 4 domains write-through to Supabase, create-only, no error surfacing, no rollback.
- **Server-side authorization** — none, except a best-effort check in `/api/admin/invite-user`
  that is **skipped when the schema isn't applied** (privilege-escalation hole). RLS is "starter," untested.
- **Mobile app** — `apps/mobile/App.tsx` is one static screen; buttons have no handlers. No nav, no auth, no screens.
- **Push notifications** — not implemented anywhere (no expo-notifications, no FCM/APNs).
- **Tests** — zero. No test framework installed.
- **File uploads / photos** — placeholders. **Payments (Stripe)** — placeholders. **Email/SMS** — placeholders.
- **CSV/payroll export** — buttons are no-ops. **GPS/geofence** on clock — labeled placeholder.

### Security notes
- `.env.local` is **gitignored and NOT committed** (verified). Good.
- ⚠️ `.env.local` misconfig: a **secret** key is assigned to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (`sb_secret_...`). Any `NEXT_PUBLIC_*` var is bundled to the browser — this leaks a secret to the client.
- ⚠️ A live **service-role JWT** sits in `.env.local` (line 8) before being overridden by a placeholder
  (line 14). README says it was previously exposed and should be **rotated**. Recommend rotating in Supabase.

---

## Roadmap to production (autonomous run — 2026-07-13)
User directive: finish everything, ready for App Store + full-time summer deployment. Working through
this list, committing each item to `main`. ☑ = done+build-verified, ⏳ = in progress, ☐ = todo,
🔒 = needs the user (Supabase project / Apple / Google / devices).

**Phase 1 — Module completeness (web, mock-mode, build-verified)**
- ☑ Staff scheduling: swaps/subs/pick-up/approvals
- ☑ Time clock + payroll: clock-out persistence, breaks, real CSV export, approve timesheets
- ☐ Chemical records: pool-closure alerts, edit, notifications
- ☐ Maintenance: persist status/assign/resolve
- ☐ Checklists: builder + persist completions
- ☐ Shift reports: persist + photo placeholder
- ☐ Inspections / patron counts: persist
- ☐ Certifications: expiry reminders
- ☐ Lessons / members / households: CRUD
- ☐ Messaging: targeted groups + unread (realtime is live-only)

**Phase 2 — RBAC server enforcement**
- ☐ Harden RLS for all tables; permission-matrix tests

**Phase 4 — QA & hardening**
- ☐ Add Vitest; unit tests for RBAC, scheduling engine, chem flagging, pricing
- ☐ Privilege-escalation tests; QA checklist per role

**Phase 3 — Native mobile (Expo)** 🔒 (needs EAS + devices + stores to truly finish)
- ☐ Navigation + real Supabase auth + port key screens
- ☐ Push notifications (FCM/APNs) + deep links

**Phase 5 — Release readiness**
- ☐ Icons/splash config, versioning, store metadata drafts, privacy policy, release checklist
- 🔒 Apple Developer Program, Google Play Console, signing, device testing, submission (you)

## Decisions needed (blocking build)
See the audit summary in chat. Key forks: mobile strategy, Supabase-live vs mock-first,
server-enforcement model (RLS vs API routes), and starting module priority.

## Change log
- 2026-07-13 — Scheduling+Approvals module: staff request time-off/swap/sub, pick-up open shifts,
  manager approvals persist + reassign shift on swap approval, unified shift store slice, `updateOr()`
  helper + scheduling/trades/timeOff repo writes. Typecheck + build pass. Committed to main.
- 2026-07-13 — Fixed root `.env.local` (URL/key/secret) + set mock mode (old Supabase project is gone).
- 2026-07-13 — Phase 0 audit performed; PROGRESS.md created. No source code changed.
