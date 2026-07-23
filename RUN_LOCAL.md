# RUN_LOCAL.md — run PoolOps Pro locally

Copy-pasteable commands. Run from the repo root unless noted.

## 0. Prereqs (one time)

```bash
# Node 18.18+ and npm
node -v

# Install dependencies (root workspaces)
npm install

# Create your local env file and fill it in (names documented in .env.example)
cp .env.example .env.local
#   → set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#     NEXT_PUBLIC_DATA_MODE=supabase, SUPABASE_SERVICE_ROLE_KEY, DEMO_ACCESS_TOKEN
```

### Apply the database migrations (one time, in the Supabase SQL editor)

Paste and run these files from `supabase/` in this order (each is additive/idempotent):

1. `schema.sql`, `rls-policies.sql` — core schema + row-level security (if not already applied)
2. `auth-profile-trigger.sql` — **required**: creates a `profiles` row on signup (fixes account creation)
3. `tenant-config.sql` — optional: adds `slug` + `config` columns so the DB stores the full tenant config
   (the app also works without this — it reads config from the in-code registry)

## 1. Run the dev server

```bash
npm run dev:web
#   → http://localhost:3000
#   → Villas tenant (path-based):  http://localhost:3000/villas/login
#   → gated demo (secret token):   http://localhost:3000/enter-demo?token=<DEMO_ACCESS_TOKEN>
```

## 2. Seed the Villas tenant config

```bash
npm run seed:villas
#   Upserts the Villas org + config. Idempotent — safe to re-run.
```

## 3. Create your admin account

```bash
npm run create-admin -- --email tristenbaglieri@gmail.com --tenant villas --first Tristen
#   Prints a temporary password. Sign in at http://localhost:3000/villas/login and change it.
#   Idempotent — re-run to reset the password.
```

## 3b. Link staff auth accounts to their staff_profiles (backfill)

New invites are linked automatically at acceptance. Run this once to link any
**existing** staff/lifeguard accounts created before the auth→staff link existed
(otherwise their My Shifts / clock-in show the "profile not set up" state). Requires
`supabase/staff-auth-link.sql` to have been applied (it's included in `_run_all.sql`).

```bash
npm run link-staff-profiles                 # all tenants, apply
npm run link-staff-profiles -- --dry-run    # report only, change nothing
npm run link-staff-profiles -- --tenant villas
#   Matches each org member to an unlinked staff row by email, writes profile_id.
#   Idempotent — safe to run repeatedly; flags anything it can't match for review.
```

## 3c. Review invite roles (privilege-escalation audit)

Flags accounts that are Admin but were invited as a non-admin role (the invite
privesc bug). Report-only by default — nothing changes until you pass `--fix`, and
even then your provisioned admin and the last admin of a tenant are never touched.

```bash
npm run review-invite-roles                 # report only — prints what looks wrong
npm run review-invite-roles -- --tenant villas
npm run review-invite-roles -- --fix        # demote ONLY the flagged mismatches
```

## 3e. Apply the additive SQL migrations (Supabase SQL Editor)

Run these once (idempotent, safe to re-run) after `schema.sql` + `rls-policies.sql`:

```
supabase/chem-taken-at.sql       # chemical_logs.taken_at (when a reading was taken)
supabase/shift-reports-rls.sql   # lifeguards see only their own shift reports (server-side)
supabase/staff-auth-link.sql     # (if not already applied) auth → staff_profiles link
```

## 3d. Password reset (email unconfigured → use the admin link)

Email/SMTP isn't configured in this project yet, so the self-serve "Forgot password?"
flow builds the correct Supabase recovery email but delivery won't happen until you
wire SMTP. The **reliable** path meanwhile is admin-driven:

- Users & Access → a member's row → **Reset** → **Copy reset link** → send it to them
  manually. They open it, set a new password, and land in the tenant.
- Any user can also change their own password at **My Account** (`/settings/security`)
  with their current password — no email needed.

**Add these to Supabase → Authentication → URL Configuration → Redirect URLs** so
recovery links are accepted:

```
https://<your-domain>/reset-password
https://<your-domain>/*/reset-password
http://localhost:3000/reset-password
http://localhost:3000/*/reset-password
```

## 4. Run the tests

```bash
npm run typecheck        # tsc --noEmit
npm test                 # vitest (unit + tenant + isolation + smoke)

# End-to-end (Playwright) — optional, runs only when configured:
npx playwright install   # one time: download browsers
E2E_BASE_URL=http://localhost:3000 \
E2E_ADMIN_EMAIL=tristenbaglieri@gmail.com \
E2E_ADMIN_PASSWORD='<the temp password>' \
  npm run e2e
#   Without those env vars the e2e suite is skipped (does not fail).
```

## 5. Build (what Vercel runs)

```bash
npm run build:web
```

## Onboarding lifeguards (in the app)

Sign in as admin → **Settings → Users & Access → Add lifeguards** → paste guard emails →
**Create invites** → copy each invite link (or wire SMTP to auto-send). Each guard opens
their link, sets a password, and gets their own login. Resend/revoke/deactivate/reset are
on the same screen.

## Deploying to Vercel (no custom domain yet)

- Set all `NEXT_PUBLIC_*` + server secrets in the Vercel project (see `.env.example`).
- Reach Villas at `https://<your-app>.vercel.app/villas`. Host-based resolution takes over
  automatically when you later point a subdomain/domain at it — no code change.
