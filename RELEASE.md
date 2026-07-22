# PoolOps Pro — Release Guide

Everything needed to ship for summer, split into **what's ready**, **what I prepared for you**,
and **🔒 what only you can do** (accounts, signing, device testing, store submission).

---

## 0. Two shipping tracks — pick your timeline

| Track | What it is | Time to live | Best for |
|---|---|---|---|
| **A. Web app (Vercel)** | The full dashboard + mobile-web preview, deployed to a URL. Works on any phone browser. | **Same day** | Getting the pool running *this summer* immediately |
| **B. Native apps (App Store + Play)** | The Expo app, submitted to both stores. | **1–3 weeks** (accounts + review) | A polished installable app later |

**Recommendation:** ship **Track A now** so staff can use it this summer, and pursue Track B in
parallel. The web app is the same backend; nothing is wasted.

---

## 1. Track A — Deploy the web app (you can do this today)

Prereq: a Supabase project exists and the 5 SQL files are applied (see `SUPABASE_SETUP.md` /
`PROGRESS.md`). Until then it runs on demo data.

1. Push is already on GitHub (`TBaglieri/poolManagementApp`).
2. Go to **vercel.com → Add New → Project → import the repo**.
3. **Root Directory:** set to `apps/web` (important — it's a monorepo).
4. **Environment Variables** (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL` = your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = publishable/anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = service role key (mark it **encrypted / server-only**)
   - `NEXT_PUBLIC_DATA_MODE` = `supabase`
   - `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` = your Vercel domain
5. **Deploy.** Vercel runs `next build`. `transpilePackages` already compiles the workspace packages.
6. Add your custom domain in Vercel if you have one.

Details: `VERCEL_DEPLOYMENT.md`.

---

## 2. Secrets & environment handling (do this before any deploy)

- ⚠️ **Rotate the old Supabase service-role key** — an old one was committed to docs historically.
  In Supabase: Settings → API → roll the key. Never prefix a secret with `NEXT_PUBLIC_`.
- `.env.local` is gitignored and must **never** be committed. Set real values only in Vercel/EAS.
- Only the publishable/anon key may reach the browser. The service-role key is server-only
  (used by `apps/web/src/app/api/admin/*` and never bundled).

---

## 3. App icons, splash & branding

**Status:** placeholder brand (name "PoolOps Pro", brand color `#0891B2` cyan, navy `#0a1521`).

Needed assets (I can't generate final production art; a designer or an icon tool can):
- **App icon** 1024×1024 PNG (no transparency, no rounded corners — stores round it).
- **Adaptive icon** (Android): foreground + background layers.
- **Splash screen** image (centered logo on brand background).
- **Web favicon / OG image** for the Vercel site.

Where they go:
- Native: `apps/mobile/app.json` → `expo.icon`, `expo.splash`, `expo.android.adaptiveIcon`,
  `expo.ios.icon`. (Config keys exist; drop the PNGs into `apps/mobile/assets/` and reference them.)
- Web: `apps/web/src/app/` (add `icon.png` / `opengraph-image.png` — Next.js picks them up).

---

## 4. Versioning & build config

- Web: `apps/web/package.json` `version`. Bump per release.
- Native: `apps/mobile/app.json` → `expo.version` (user-facing, e.g. `1.0.0`),
  `expo.ios.buildNumber`, `expo.android.versionCode` (integer, increment every store upload).
- Tag releases in git: `git tag v1.0.0 && git push --tags`.

---

## 5. Store metadata — DRAFTS (edit to taste)

**App name:** PoolOps Pro
**Subtitle / short (30 chars):** Pool & lifeguard operations
**Category:** Business (primary) / Productivity (secondary)

**Full description (draft):**
> PoolOps Pro is the all-in-one operations app for community pools, swim clubs, and aquatic
> centers. Build conflict-free staff schedules that respect time-off, certifications, and hour
> limits. Let lifeguards clock in, swap shifts, and request time off from their phones. Log
> chemical readings with automatic out-of-range and pool-closure alerts. Track maintenance,
> checklists, inspections, patron counts, certifications, and swim lessons — and keep the whole
> team in sync with built-in messaging. Role-based access keeps managers, staff, and members
> seeing exactly what they should.

**Keywords (App Store, 100 chars):**
> pool,lifeguard,aquatics,swim,scheduling,timeclock,chemical,pool management,staff,shift

**Promotional text / What's New (1.0):**
> Initial release: scheduling with auto-builder, time clock, chemical logs with closure alerts,
> maintenance, messaging, and role-based access.

**Support URL / Marketing URL:** your Vercel domain (e.g. `https://poolops.yourdomain.com`).

**Screenshots to capture** (required sizes below in §8). Capture these screens:
1. Dashboard (manager) · 2. Schedule / Auto Builder · 3. Mobile clock-in · 4. Chemical logs with
   a closure alert · 5. Team chat · 6. Maintenance board · 7. Time-off / swap request · 8. Pricing.
   *(Use the in-app mobile preview `/m/*` for phone-framed shots.)*

---

## 6. Privacy policy & data-safety (stores require this)

You need a **public privacy policy URL** before submitting to either store.

**Data the app collects/stores:** name, email, phone (staff/members); work schedule & time
records; certifications; messages; chemical/maintenance logs. No third-party ad tracking. Auth via
Supabase; payments (if enabled) via Stripe.

**Apple Privacy Nutrition Label (App Store Connect → App Privacy):**
- Contact Info (name, email, phone) — App Functionality — linked to identity, **not** for tracking.
- User Content (messages, photos in reports) — App Functionality — linked to identity.
- Identifiers (user ID) — App Functionality.
- **Tracking: No.**

**Google Play Data Safety form:**
- Collects: Personal info (name, email, phone), Messages, Photos (optional report photos), App
  activity. Data **encrypted in transit**. Users can request deletion (Supabase row delete).
- Not shared with third parties for advertising.

**Privacy policy must state:** what's collected, why, retention, that data is org-scoped and
RLS-protected, how to request deletion, and your contact email. I can draft the full policy text
on request — you'll host it (a page on your Vercel site works).

---

## 7. Release checklist

- [ ] Supabase project created; 5 SQL files applied; **RLS tested** per role (see QA checklist).
- [ ] Service-role key rotated; all secrets set in Vercel/EAS (never in git).
- [ ] `npm test` green; `npm run build:web` clean.
- [ ] Icons, splash, favicon, OG image added.
- [ ] Versions bumped; git tagged.
- [ ] Privacy policy published at a public URL.
- [ ] Web: deployed to Vercel with custom domain + HTTPS.
- [ ] Store metadata + screenshots prepared.
- [ ] 🔒 Native: signed builds via EAS; TestFlight / internal testing pass on real devices.
- [ ] 🔒 Submitted to App Store review + Play Console review.

---

## 8. 🔒 What ONLY YOU can do (I can't — accounts, hardware, legal)

These require your identity, payment, physical devices, or store accounts. Step-by-step:

**A. Apple Developer Program** ($99/yr)
1. Enroll at developer.apple.com/programs (individual or organization; org needs a D-U-N-S number).
2. In App Store Connect, create the app record (bundle id e.g. `com.yourorg.poolopspro`).
3. Certificates/provisioning: easiest via **EAS** (`eas credentials`) which manages signing for you.

**B. Google Play Console** ($25 one-time)
1. Register at play.google.com/console.
2. Create the app; complete the content rating, data-safety, and target-audience questionnaires.
3. Set up a signing key (Play App Signing — recommended) or let EAS manage it.

**C. Build the native apps (Expo EAS)**
1. `npm i -g eas-cli && eas login`
2. In `apps/mobile`: `eas build:configure`, then `eas build --platform ios` / `--platform android`.
3. EAS produces signed `.ipa` / `.aab`. Submit with `eas submit`.
   *(Note: the native app currently needs its screens finished — see PROGRESS.md Phase 3.)*

**D. Device testing** — install TestFlight (iOS) / internal-testing (Android) builds on real
phones and walk every role. I can't run on hardware from here.

**E. Store submission & review** — upload builds + metadata; respond to reviewer questions.
Apple review is typically 1–3 days; Google a few hours to a few days.

**F. Legal** — finalize the privacy policy, terms of service, and (if you enable Stripe) confirm
payment/tax setup. Have counsel review minor-labor-law handling before relying on scheduling for
under-18 staff.
