# PoolOps Pro 🌊

**The operations platform for community pools, swim clubs, camps, and municipal aquatic centers.** A web dashboard for the office and a mobile app for the deck — sharing one backend through Supabase.

PoolOps Pro is an original, legally distinct product. It is **not** affiliated with, and does not copy the branding, code, UI, text, colors, logos, or assets of, any other aquatics software.

---

## Highlights

- 🤖 **Auto Schedule Builder** — generate a balanced, conflict-free weekly draft that honors approved time off, availability, certifications, coverage rules, and hour limits — then review and publish.
- ✅ **Manager review & publish flow** — drafts become live shifts, notify staff, and post a "Schedule published" announcement to All Team.
- 💬 **All Team chat** — every active member can read All Team; managers post announcements, pin, and mark urgent.
- 🔄 **Web ↔ mobile sync** — shared data layer with `mock` and `supabase` modes and realtime subscription helpers.
- 🔐 **12 roles + permission map** — role switcher, `PermissionGate`, `AccessRestricted`, and a permission matrix; RLS-ready.
- 💳 **Pricing & setup** — Small / Medium / Big plans, setup packages, plan-recommendation wizard, billing & Stripe placeholders.
- 🧪 24+ operations modules: chemicals, checklists, inspections, maintenance, certifications, lessons, members, documents, payroll, reports.

## Tech stack

| Area        | Choice                                                             |
|-------------|-------------------------------------------------------------------|
| Web         | Next.js 14 (App Router), React 18, TypeScript                     |
| Styling     | Tailwind CSS, custom components, Lucide icons                     |
| Charts      | Recharts                                                          |
| State       | Zustand (demo store + session)                                    |
| Backend     | Supabase (Postgres, Auth, Realtime, Storage) — `@supabase/ssr`    |
| Mobile      | Phone-framed in-app preview (`/m/*`) + Expo scaffold for native   |
| Monorepo    | npm workspaces                                                    |

## Repository layout

```
/apps
  /web        Next.js App Router dashboard + mobile preview (/m/*)
  /mobile     Expo React Native scaffold (env + clients ready)
/packages
  /shared     Domain types, RBAC, mock/seed data, pricing, utils
  /scheduling Deterministic Auto Schedule Builder engine
  /supabase   Shared Supabase clients, config, realtime helpers
/supabase     schema.sql · rls-policies.sql · realtime.sql · storage.sql · seed.sql
SUPABASE_SETUP.md · STRIPE_SETUP.md · SECURITY.md · README.md
```

> The original `/packages/types`, `/data`, `/ui`, `/utils` idea is consolidated into `/packages/shared` (types + data + rbac + utils) to avoid churn. Scheduling and Supabase are their own packages.

## Run the web app

```bash
# from the repo root
npm install
npm run dev:web         # http://localhost:3000
```

Then open <http://localhost:3000>:
- **Landing** `/` → **Pricing** `/pricing` → **Login** `/login`
- Pick any of the 12 demo roles. Web roles land on `/dashboard`; mobile roles land on `/m/home`.
- Switch roles anytime with the **role switcher** (top-right).

Other scripts:

```bash
npm run build:web       # production build
npm run start:web       # serve the production build
npm run typecheck       # tsc --noEmit for the web app
```

## Run / preview the mobile app

The fastest way to see the mobile experience is the **in-app preview**, which renders the phone UI in the browser (great for demos and screenshots):

- Visit `/m/home` (or log in as a Lifeguard / Head Lifeguard / Swim Instructor / Maintenance role).
- Tabs: **Home · Schedule · Chat · Clock · Profile**, plus `/m/manager`, `/m/report`, `/m/checklists`, `/m/chemicals`, `/m/classes`.

A native **Expo** scaffold lives in `apps/mobile` (env + shared Supabase clients). To build it out:

```bash
cd apps/mobile
cp .env.example .env       # fill EXPO_PUBLIC_* values
npm install
npx expo start
```

## Supabase mode & data layer

PoolOps Pro runs in two modes, chosen by `NEXT_PUBLIC_DATA_MODE`:

- **`mock`** — bundled demo data, no backend needed.
- **`supabase`** — the real path: Supabase Auth + Postgres (RLS) shared by web and mobile.

How it works:

- **Env loading** — `apps/web/next.config.mjs` loads a `.env.local` placed in the **repo root** (where yours lives) as well as `apps/web/.env.local`, so local dev and Vercel both work. Only the publishable/anon key reaches the browser; the service-role key is server-only and never bundled (verified: 0 occurrences in client output).
- **Repository layer** — `apps/web/src/lib/repos/` exposes `repos.<domain>.<method>()` with a **mock impl and a Supabase impl** per domain (organizations, facilities, staff, chat, notifications, chemicals, maintenance, timeClock, timeOff, scheduling, quoteRequests, pricing, billing, …). Every call **falls back to demo data on any error** (missing table, network) and reports `{ data, source, error }`.
- **Auth** — `apps/web/src/lib/auth.ts` wraps Supabase Auth (sign up / sign in / sign out). The login page does **real auth in supabase mode** and keeps the demo role switcher for instant exploration.
- **Live hydration & write-through** — `SupabaseHydrator` pulls live rows into the store on load; chat posts, chemical logs, maintenance reports, and clock-ins **persist to Supabase** in supabase mode.
- **Health** — Settings → **Supabase connection** (and the top-bar chip) show *Live sync / Schema needed / Setup needed / Offline / Local demo* via a real probe.

**To go live (one-time):** in the Supabase SQL editor run, in order: `supabase/schema.sql` → `rls-policies.sql` → `realtime.sql` → `storage.sql` → `seed.sql`. Then reload — the chip flips to **Live sync** and quote requests, chat, chemicals, maintenance, and time-clock writes hit Postgres. Until the schema is applied the app stays fully usable on demo data and shows a "Schema needed" hint.

Full guide: **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**. In short:

1. Put `.env.local` in the **repo root** (or `apps/web/.env.local`).
2. **Rotate** the exposed service role key and paste the new one (server-only).
3. Run the five SQL files above.
4. Set `NEXT_PUBLIC_DATA_MODE=supabase`. The chip shows **Live sync** when connected.

## Stripe setup

Placeholder billing today — see **[STRIPE_SETUP.md](./STRIPE_SETUP.md)** for the production wiring (Checkout, customer portal, webhooks). No real charges are made in the demo.

## Pricing / setup system

- `/pricing` — plan cards, monthly/annual toggle + savings badge, comparison table, setup packages, FAQ, and a **plan recommendation wizard**.
- `/quote` — quote request with a live recommendation sidebar.
- `/billing` — billing status, current plan, payment method, payment options, mock invoices, change-plan.
- `/settings/subscription` — usage and plan management.

Plans: **Small Pool** ($49/mo, $529/yr), **Medium Pool** ($149/mo, $1,609/yr), **Big Pool / Enterprise** (custom, from $299/mo). Setup: **Starter** ($0), **Guided** ($299), **Premium Migration** (custom).

## Auto Scheduling feature

- Engine: `packages/scheduling/src/autoScheduler.ts` → `generateScheduleDraft(...)` (deterministic).
- UI: `/schedule/auto-builder`. Choose facility, week, template, open-shift handling, and optimization (balanced vs preferences), then **Generate draft schedule**.
- The draft shows coverage score, warnings, staff hours, open shifts, suggested fixes, and **"N approved time-off requests were avoided."**
- Drafts list: `/schedule/drafts`. Publish via **Approve & publish** → confirmation modal → live shifts + notifications + All Team announcement.

## All Team chat

- `/chat` (web) and `/m/chat` (mobile). Channels: All Team, Lifeguards, Managers, Swim Instructors, Maintenance, Payroll/Admin, and facility channels.
- Every active member can read **All Team**. Announce-capable roles post announcements, pin, and flag urgent.
- Publishing a schedule auto-posts to All Team (toggle in Settings).

## Role / access system

- 12 roles in `packages/shared/src/rbac/roles.ts`; permissions in `permissions.ts`.
- `useAccess()`, `PermissionGate`, `AccessRestricted`, role badges, and the demo **role switcher**.
- Manage at `/settings/roles` and `/settings/permissions`.
- Example guarantees: payroll role can open `/payroll`; lowest-level staff **cannot**; only managers/admins can reach the Auto Builder and publish.

## Demo vs Real customer mode

The app cleanly separates two modes (tracked in `useSession.mode`):

- **Demo mode** — entered via "Continue as a demo role" on `/login`. Seeded data, a **Demo Mode** badge + **Exit Demo** button in the top bar, a "Create Your Real Organization" CTA banner, and the role switcher (preview any of the 12 roles). Changes use sample data.
- **Real customer mode** — entered via Supabase **sign up / sign in**. New users are routed to `/setup` (a 7-step **org-creation wizard**: name, type, plan, setup package, scale, first facility, invite). No demo badge, no role switcher; role comes from `organization_members`. The app never traps you in demo mode.

## Account creation, invites & delegated management

- **Invite by email**: Staff → *Invite staff* or **Settings → Users & Access** (`/settings/users`, `/staff/invites`). The Invite modal collects email/name/role/facility/employment + management-permission toggles, creates an invitation (statuses: draft/sent/pending/accepted/expired/canceled), and produces an **accept link** (`/accept-invite/[token]`). Email sending is a placeholder until a provider is wired.
- **Server route**: `/api/admin/invite-user` uses the service-role admin client **server-side only**, validates the caller's permission, and creates the Supabase Auth user + `staff_invitations` record.
- **Hierarchy enforced**: you can only assign roles at/below your level; only Org Admin / Super Admin can grant management permissions. Lowest-level staff can't invite or manage users. New tables: `staff_invitations`, `user_management_permissions`.

## Performance & deployment

See **[PERFORMANCE.md](./PERFORMANCE.md)** (persistent shell, lazy charts, route progress, cached stores) and **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** (root dir `apps/web`, env vars, Supabase config).

## GitHub workflow

```bash
git status
git add .
git commit -m "Finish PoolOps Pro auto scheduling chat Supabase sync and pricing"
git push
```

If there's no remote and GitHub CLI is available:

```bash
gh repo create poolManagementApp --private --source=. --remote=origin --push
```

Otherwise:

```bash
git remote add origin git@github.com:TBaglieri/poolManagementApp.git
git branch -M main
git push -u origin main
```

## Environment variables

**Web** (`apps/web/.env.local`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://bqhhbekmqsmfkxyzdvol.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_DBaasd3KSY392tsSUy3wQQ_VFE3EM_a
SUPABASE_SERVICE_ROLE_KEY=PASTE_ROTATED_SERVICE_ROLE_KEY_HERE   # server-only
NEXT_PUBLIC_DATA_MODE=supabase    # or: mock
# Stripe (placeholder)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

**Mobile** (`apps/mobile/.env`):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://bqhhbekmqsmfkxyzdvol.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_DBaasd3KSY392tsSUy3wQQ_VFE3EM_a
EXPO_PUBLIC_DATA_MODE=supabase    # or: mock
```

`mock` mode runs the whole app on bundled demo data — no backend required. `supabase` mode falls back to `mock` automatically if env vars are missing.

## Deployment notes

- **Web:** deploy `apps/web` to Vercel. Set the env vars above in the project settings (service role + Stripe secret as encrypted server vars). `transpilePackages` already compiles the workspace packages.
- **Supabase:** run the SQL files; enable Realtime and Auth email.
- **Mobile:** build the Expo app with EAS once the native screens are completed.

## Known limitations

- **Supabase schema must be applied** to your project for full Supabase mode. Until you run the five SQL files, the app runs on demo data and shows a "Schema needed" hint (DDL can't be applied remotely without the DB password).
- **Auth email confirmation** is on by default in Supabase. For instant local testing, enable *Auto Confirm* in Supabase → Authentication → Providers → Email, or confirm via the emailed link.
- **Role from membership:** a newly signed-up user defaults to **Org Admin** so a new pool can start setting up. Real role resolution from `organization_members` activates once you seed/link memberships.
- Mobile is delivered as a polished **in-app phone preview** (`/m/*`) plus an Expo scaffold; the native build needs the screens ported to React Native.
- Stripe billing, CSV/payroll exports, file uploads, email/SMS, and under-18 labor rules are **placeholders** pending integration and legal review (see SECURITY.md).
- Starter RLS policies must be reviewed and tested before production.
- This environment blocks SSH (port 22) and `gh` isn't installed, so the GitHub push must be completed by you (see GitHub workflow).

## Security

See **[SECURITY.md](./SECURITY.md)** — rotate the exposed Supabase key, never commit secrets, keep tax docs in private buckets with signed URLs, and enforce RBAC server-side via RLS.

---

© PoolOps Pro — a demonstration product. Built as an original, legally distinct platform.
