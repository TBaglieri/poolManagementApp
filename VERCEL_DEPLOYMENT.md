# Deploying PoolOps Pro (web) to Vercel

The web app lives in `apps/web` of an npm-workspaces monorepo. Vercel deploys the Next.js app from that subdirectory.

## 1. Push to GitHub
See the GitHub workflow in the README. The repo must be on GitHub before importing to Vercel.

## 2. Import the project
1. <https://vercel.com/new> → import `TBaglieri/poolManagementApp`.
2. **Framework Preset:** Next.js (auto-detected).
3. **Root Directory:** `apps/web`  ← important (monorepo).
4. Build & Output settings: leave defaults. Vercel installs from the repo root so the `@poolops/*` workspace packages resolve; `transpilePackages` compiles them.

## 3. Environment variables
Add these in **Project → Settings → Environment Variables** (Production + Preview):

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bqhhbekmqsmfkxyzdvol.supabase.co` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your publishable/anon key | Public |
| `NEXT_PUBLIC_DATA_MODE` | `supabase` | Use `supabase` in production |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | For invite redirect links |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.vercel.app` | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | **rotated** service role key | **Server-only / encrypted.** Never `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | (optional) | Public |
| `STRIPE_SECRET_KEY` | (optional) | Server-only |
| `STRIPE_WEBHOOK_SECRET` | (optional) | Server-only |

Notes:
- **Do not** add the Expo/mobile `EXPO_PUBLIC_*` vars to Vercel — they're for the mobile build only.
- The **service role key** must be a protected server env var (Vercel encrypts it). It is read only by server code (`/api/admin/invite-user`, `packages/supabase/src/admin.ts`) and never shipped to the browser (verified: 0 occurrences in client bundle).
- `NEXT_PUBLIC_DATA_MODE=supabase` makes Supabase the real path; `mock` runs on demo data.

## 4. Supabase configuration before real users
1. Run the SQL files in the Supabase SQL editor: `schema.sql` → `rls-policies.sql` → `realtime.sql` → `storage.sql` → `seed.sql` (see SUPABASE_SETUP.md).
2. Auth → URL Configuration: add your Vercel domain to **Redirect URLs** (e.g. `https://your-domain.vercel.app/login`, `/accept-invite/*`).
3. Auth → Providers → Email: enable; turn on **Auto Confirm** for frictionless onboarding, or configure SMTP for real confirmation/invite emails.
4. **Test RLS** with each role before inviting real users.

## 5. After deploy — smoke test
- `/` and `/pricing` load (public).
- `/login` → sign up → redirected to `/setup` (org creation wizard) → `/dashboard`.
- Top-bar chip shows **Live sync** (green) once the schema is applied.
- Quote form on `/quote` writes to `quote_requests`.

## 6. The root `.env.local` & local dev
`apps/web/next.config.mjs` loads a `.env.local` from the **repo root** (where yours is) and from `apps/web`. It never overrides real env (Vercel dashboard values always win), so the loader is a no-op in production.

## Build commands (reference)
```bash
npm install            # at repo root (installs workspaces)
npm run build:web      # next build in apps/web
npm run start:web      # serve the production build
```
