# PoolOps Pro — Native App (Expo / React Native)

The real native app lives in `apps/mobile`. It shares the Supabase backend with the web app.

## Verified
- ✅ **TypeScript compiles** (`npx tsc --noEmit` in `apps/mobile`).
- ✅ **Metro bundles** for Android (`npx expo export --platform android` → 950 modules, clean).
- ⚠️ **Not yet run on a device / simulator or built via EAS** — that needs your machine + accounts.
  Native-module behavior (push delivery, secure storage) only fully exercises on a real device.

## What's built
- **Auth** — real Supabase email/password sign in + sign up, session persisted via AsyncStorage
  (`src/auth/AuthContext.tsx`). Falls back to a "demo mode" when no backend is configured.
- **Navigation** — bottom tabs (Home · Schedule · Clock · Chat · Profile) + a stack screen for
  Report Issue (`src/navigation/RootNavigator.tsx`). Deep links via the `poolops://` scheme.
- **Screens** (`src/screens/`) wired to Supabase through `src/api.ts`:
  - **Home** — today's shift + latest announcement (pull to refresh).
  - **Schedule** — your upcoming shifts.
  - **Clock** — clock in / out, writing to `time_clock_entries`.
  - **Chat** — announcements feed.
  - **Report Issue** — file a maintenance issue (`maintenance_issues`).
  - **Profile** — identity + sign out.
- **Push notifications** — `src/lib/notifications.ts`: permission request, Expo push token,
  Android channel, foreground handler, and a tap→deep-link handler wired in `App.tsx`
  (a "shift published" push opens the Schedule tab).

## Run it locally
```bash
cd apps/mobile
cp .env.example .env         # paste your NEW project URL + publishable key; set DATA_MODE
npm install                  # self-contained (apps/mobile is NOT a root workspace member)
npx expo start               # press i (iOS) / a (Android), or scan the QR with Expo Go
```
> `apps/mobile` installs its own `node_modules` — always use `npm install` from **inside**
> `apps/mobile` (or `npm run install:mobile` from the root), not the root `npm install`.

## What still needs doing (native)
- **Port the remaining screens** to match the web mobile preview `/m/*`: full My-Schedule with
  request/swap/pick-up, checklists runner, chemicals log form, classes/attendance, richer chat with
  posting. The web versions in `apps/web/src/app/m/*` are the reference.
- **Push server side** — a Supabase Edge Function / server job that, on shift publish / out-of-range
  reading / approval, POSTs to `https://exp.host/--/api/v2/push/send` with the user's Expo token.
  Needs a `push_tokens` table (see `savePushToken` in `src/lib/notifications.ts`) + RLS.
- **Native credentials & delivery** — APNs key (iOS) and FCM (Android) via `eas credentials`.
- **App icon & splash PNGs** — drop into `apps/mobile/assets/` and reference in `app.json`.
- **EAS build + submit** — see `RELEASE.md §8`. `eas build` → `eas submit`.

## Architecture note
The web app's `repos` are Next.js `"use client"` modules, so the native app has its own small data
layer (`src/api.ts`) querying the same Supabase tables directly (RLS enforces access). Domain types
are duplicated minimally there; a future refactor could share `@poolops/shared` via a Metro monorepo
config, but the app currently installs self-contained to keep bundling simple and reliable.
