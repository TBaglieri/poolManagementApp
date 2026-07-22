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

## Supabase setup

Full guide: **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**. In short:

1. Copy `apps/web/.env.example` → `apps/web/.env.local`.
2. **Rotate** the exposed service role key and paste the new one (server-only).
3. Run, in order: `supabase/schema.sql`, `rls-policies.sql`, `realtime.sql`, `storage.sql`, then optionally `seed.sql`.
4. Set `NEXT_PUBLIC_DATA_MODE=supabase`. The top-bar chip shows **Live sync** when connected.

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

- Mobile is delivered as a polished **in-app phone preview** (`/m/*`) plus an Expo scaffold; the native build needs the screens ported to React Native.
- `mock` mode is the primary demo path. `supabase` mode is fully scaffolded (schema, RLS, realtime, clients) but requires running the SQL and rotating the key.
- Auth is a demo role switcher; Supabase Auth is wired (`@supabase/ssr`) but not the active login.
- Stripe billing, CSV/payroll exports, file uploads, email/SMS, and under-18 labor rules are **placeholders** pending integration and legal review (see SECURITY.md).
- Starter RLS policies must be reviewed and tested before production.

## Security

See **[SECURITY.md](./SECURITY.md)** — rotate the exposed Supabase key, never commit secrets, keep tax docs in private buckets with signed URLs, and enforce RBAC server-side via RLS.

---

© PoolOps Pro — a demonstration product. Built as an original, legally distinct platform.
