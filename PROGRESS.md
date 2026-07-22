# PoolOps Pro — Build Progress

> Running log you can check anytime. Newest entries at top of each section.

## Current status: **BACKEND IS LIVE.** Supabase project bqhhbekmqsmfkxyzdvol resumed; schema + RLS + seed applied and verified (tables 200, seed present, RLS enforcing). Web + native apps built and verified. Next: sign in against live data, then deploy (Vercel) + EAS build.

Verified this session:
- Web: `npm test` → 39/39 · `npm run typecheck` clean · `npm run build:web` → 48/48 routes.
- Native: `npx tsc --noEmit` clean · `npx expo export` bundles (950 modules).
Committed to `main`: scheduling, time clock/payroll, chemicals, maintenance, certifications, test
suite, RLS hardening, native Expo app, and docs (RELEASE.md, QA.md, NATIVE.md).

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
- ☑ Chemical records: pool-closure alerts + per-pool safety status (chlorine/pH critical)
- ☑ Maintenance: persist status/assign via repos.maintenance.update
- ☑ Checklists: run-checklist modal, toggle items, submit, completion log (functional; Supabase persist + photo are labeled placeholders)
- ☑ Patron counts: log/record works, trends chart, role-gated (functional)
- ☑ Certifications: renewal-reminders panel + record/renew modal (auto status from expiry)
- ◑ Shift reports / inspections: functional views; submit/persist partially wired (photo = placeholder)
- ◑ Lessons / members / households: solid read/roster views; private-lesson-request + full CRUD not built
- ◑ Messaging: channels + announcements work; targeted-group unread + realtime are live-only

**Phase 2 — RBAC server enforcement**
- ☑ Harden RLS: staff self-service policies for shifts (claim open), shift_trade_requests
  (insert own/approve), checklist_completions, patron_counts, shift_reports; scoped
  policies for schedule_draft_shifts + schedule_template_requirements (were default-deny).
  ⚠ Careful SQL, but **not yet applied/tested on a live DB** (no project).
- ☑ Permission-matrix + privilege-escalation tests (see Phase 4)
- ☑ QA checklist per role + access matrix (QA.md)

**Phase 4 — QA & hardening**
- ☑ Vitest set up; 39 passing tests — RBAC matrix + privilege escalation, scheduling
  engine (time-off/cert/double-book/determinism), CSV. Run: `npm test`
- ☐ QA checklist per role

**Phase 3 — Native mobile (Expo)** 🔒 (needs EAS + devices + stores to truly finish)
- ☑ Real Expo app: Supabase auth, bottom-tab nav (Home/Schedule/Clock/Chat/Profile),
  Report-Issue screen, all wired to Supabase via src/api.ts. **Verified: tsc clean +
  `expo export` bundles (950 modules).** Not device/EAS-tested. See NATIVE.md.
- ☑ Push-notification client scaffolding (token, Android channel, tap→deep-link)
- ◑ Port remaining screens (checklists, chemicals, classes, full my-schedule); push server side (Edge Function)

**Phase 5 — Release readiness**
- ☑ RELEASE.md: web (Vercel) + native tracks, secrets, icons/splash, versioning, store
  metadata drafts, privacy/data-safety content, release checklist, "only you can do" steps
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
