# PoolOps Pro — Your Launch Itinerary

Do these in order. 🤝 = a point where you tell me and I take over. Times are rough.

---

## PHASE A — Make it real (live backend) · ~40 min · free
**Goal: a working database so the app saves real data.**

**A1. Create the Supabase project** (~5 min)
- Go to **supabase.com** → sign in → **New project**.
- Name: `poolops-pro`. Pick a region near your pool. Set a **database password** and save it somewhere safe.
- Wait ~2 min for it to provision.

**A2. Grab your keys** (~2 min)
- Project **Settings → API**. Copy three things:
  - **Project URL** — `https://<something>.supabase.co`
  - **anon / publishable key** (safe for phones/browser)
  - **service_role key** (SECRET — server only, never in the app)

**A3. Create the database tables** (~10 min)
- Open **SQL Editor** in Supabase. Run these 5 files from the repo **in this exact order** (open each, paste, Run):
  1. `supabase/schema.sql`
  2. `supabase/rls-policies.sql`
  3. `supabase/realtime.sql`
  4. `supabase/storage.sql`
  5. `supabase/seed.sql`
- Each should say "Success". If one errors, stop and send me the error.

**A4. Point the app at it** (~5 min)
- In the repo root, edit **`.env.local`** (I left labeled placeholders):
  ```
  NEXT_PUBLIC_SUPABASE_URL=<your Project URL>
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon/publishable key>
  SUPABASE_SERVICE_ROLE_KEY=<your service_role key>
  NEXT_PUBLIC_DATA_MODE=supabase
  ```
- Edit **`apps/mobile/.env`**:
  ```
  EXPO_PUBLIC_SUPABASE_URL=<your Project URL>
  EXPO_PUBLIC_SUPABASE_ANON_KEY=<your anon/publishable key>
  EXPO_PUBLIC_DATA_MODE=supabase
  ```

**A5. Run it locally** (~10 min)
- Install **Node 18.18+** if you don't have it (nodejs.org).
- In a terminal at the repo root:
  ```
  npm install
  npm run dev:web
  ```
- Open **http://localhost:3000**. The status chip should say **Live sync**.

**🤝 A6. Tell me it's live.** I'll run a live probe, reconcile the app's IDs with real
database rows so everything persists correctly, and verify RLS per role. **This is the one
step that unblocks me to finish the "prove it really works" part.**

---

## PHASE B — Put it online for summer (web) · ~25 min · free
**Goal: staff use it from any phone browser this week — no app store needed.**

**B1. Rotate the exposed key** (~2 min) — Supabase **Settings → API → roll** the service_role key
(an old one leaked historically). Paste the new one into `.env.local` and later into Vercel.

**B2. Deploy to Vercel** (~15 min)
- **vercel.com** → sign in with GitHub → **Add New → Project** → import `poolManagementApp`.
- **Root Directory: `apps/web`** (critical — it's a monorepo).
- Add Environment Variables (same values as A4, plus mark service_role **encrypted**):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `NEXT_PUBLIC_DATA_MODE=supabase`, `NEXT_PUBLIC_APP_URL` + `NEXT_PUBLIC_SITE_URL` = your Vercel URL.
- **Deploy.** You get a live URL.

**B3. (Optional) Custom domain** (~5 min) — add your domain in Vercel → Domains.

**B4. Invite your staff** — send them the URL; they sign up / you invite them from Settings → Users.

> ✅ After Phase B you have a working product your team can use this summer.

---

## PHASE C — Preview the native app · ~15 min · free
**Goal: see the iPhone/Android app running before doing the store work.**

- On your phone, install **Expo Go** (App Store / Play Store).
- On your computer:
  ```
  cd apps/mobile
  npm install
  npx expo start
  ```
- Scan the QR code with Expo Go. Sign in with a real account (from Phase A). Try clock-in, schedule, chat.

---

## PHASE D — Ship native apps to the stores · 1–3 weeks · $124 + review time
**Goal: real installable apps on the App Store + Google Play. Only you can do the account parts.**

**D1. Developer accounts** (~1–3 days for Apple approval)
- **Apple Developer Program** — developer.apple.com/programs — **$99/year**.
- **Google Play Console** — play.google.com/console — **$25 one-time**.

**D2. Build with EAS** (~1–2 hrs)
```
npm install -g eas-cli
eas login
cd apps/mobile
eas build:configure          # sets your projectId
eas credentials              # let EAS manage signing (easiest)
eas build --platform ios
eas build --platform android
```

**D3. App assets** — you'll need a 1024×1024 app icon + splash image. Hand me your logo/colors and
I'll wire the config; you (or a designer/icon tool) produce the final PNGs into `apps/mobile/assets/`.

**D4. Submit** (~review: hours–3 days)
```
eas submit --platform ios
eas submit --platform android
```
- Fill store listings using the drafts in `RELEASE.md §5` (I wrote descriptions, keywords, screenshot list).
- Complete Apple's Privacy Labels + Google's Data Safety form using `RELEASE.md §6`.

**🤝 D5. Push notifications** — once Supabase is live, tell me and I'll build the server function that
sends a push when a schedule publishes / a reading is out of range / an approval happens.

---

## PHASE E — Before wide launch · ongoing
- **Privacy policy** — you need a public URL. 🤝 Tell me and I'll draft the full text; you host it (a page on your Vercel site works).
- **Legal** — have someone confirm minor-labor-law handling before relying on scheduling for under-18 staff.
- **Stripe** — only if you want to charge other pools; leave off for your own use.

---

## Quick reference — the 3 things only YOU can do
| Thing | Where | Cost |
|---|---|---|
| Create Supabase project | supabase.com | free |
| Apple Developer Program | developer.apple.com | $99/yr |
| Google Play Console | play.google.com/console | $25 once |

**Fastest win:** Phases A + B today → your pool is running on the web app this week. Native store
apps (Phase D) can follow over the next couple weeks.

**Whenever you finish Phase A, come tell me** — that's what lets me verify and finish the live wiring.
