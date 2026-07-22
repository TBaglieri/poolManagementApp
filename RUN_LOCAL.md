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
