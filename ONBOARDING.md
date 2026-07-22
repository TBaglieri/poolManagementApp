# ONBOARDING.md — Add pool number two (in under 15 minutes)

Every pool is a **configuration record**, not a code fork. Adding a tenant never
means copying components or CSS. There are two ways to do it; pick one.

---

## Option A — No code, from the admin UI (fastest, great for demos)

1. Sign in as an org admin / super admin and open **Settings → Branding & Modules**.
2. Go to the **Advanced** tab → **Onboard a new pool**. Type the pool's name and
   pick a primary color. It generates a ready-to-use config record and a slug.
3. Click **Download config record** — you now have `<slug>.tenant.json`.
4. On the **Theme**, **Modules**, **Identity & Copy**, and **Role Labels** tabs you
   can fine-tune everything (logo upload, presets, which modules are on, "Board" vs
   "HOA Committee", pool hours, etc.). Every change previews live.
5. Click **Save changes**. In the current build this persists to the browser
   (mock mode) or the org's `config` column (supabase mode).

That's enough to walk a client through their own branded app. To make it permanent
and reachable by URL, do Option B step 1 with the JSON you downloaded.

---

## Option B — One registry entry (permanent, code)

1. Open `packages/shared/src/tenant/registry.ts` and add an entry to
   `TENANT_INPUTS`. Only list what differs from the defaults:

   ```ts
   riverside: {
     slug: "riverside",
     displayName: "Riverside Swim Club",
     productName: "Riverside Swim Club",
     organizationType: "swim_club",
     branding: { monogram: "RS" },
     theme: { brand: "#2E8BC0", secondary: "#1B3A4B", accent: "#E0B584" },
     // turn modules on/off for this pool:
     features: { lessons: true, community: false },
     roleLabels: { org_admin: "Board" },
   },
   ```

   A full accessible palette is generated from `theme.brand`; you don't need to
   specify every shade. Anything you omit inherits from `DEFAULT_TENANT_CONFIG`.

2. **Reach it by URL** — no code needed for either:
   - Subdomain (primary): `riverside.yourapp.com` resolves to `riverside`.
   - Custom domain: add `"pool.riversideswim.com": "riverside"` to `CUSTOM_DOMAINS`
     in `apps/web/src/middleware.ts`.
   - Local/dev: `http://localhost:3000/dashboard?tenant=riverside`.
   - Pin a single-tenant deployment with `NEXT_PUBLIC_TENANT=riverside`.

3. (Optional, supabase mode) Store the config in the database so it's the source of
   truth: run `supabase/tenant-config.sql` (additive) or paste the JSON you
   exported from the admin UI:
   ```sql
   update public.organizations set config = '<json>'::jsonb where slug = 'riverside';
   ```

4. Verify: `npm run typecheck && npm test` (adds it to the isolation + config tests),
   then load `/dashboard?tenant=riverside` and confirm the brand, nav (disabled
   modules hidden), and role labels are correct.

---

## Spin up (and revoke) a gated demo for a prospect

The demo is a **standalone, invitation-only** tenant. It is never linked from the
public UI and never resolves without a token, so Villas users and random visitors
can't reach or discover it.

**Give a prospect access:**
1. Set a secret in the environment (per deployment): `DEMO_ACCESS_TOKEN=<long-random-string>`.
   (Locally it defaults to `poolops-demo` so you can try it immediately.)
2. Send them exactly one link:
   `https://<your-app>/enter-demo?token=<the-secret>`
   (or, single-tenant style, a dedicated unlisted `demo.<your-app>` host).
3. That link sets a `demo_access` cookie, drops them into the `demo` tenant on the
   dashboard, and unlocks the **role switcher** (top bar) so they can explore every
   role. All other tenants keep the switcher hidden.

**Seed the demo data** (realistic season of readings, roster, shifts, chat threads):
- Local / mock mode: the app ships with a full bundled demo dataset — nothing to run.
- Supabase mode: apply `supabase/seed-villas.sql` (single-facility dataset) under a
  demo org; it's isolated from real tenants by the same RLS in §7.

**Revoke access:**
- A prospect can leave via the **Exit Demo** button (clears their cookie).
- To cut off everyone at once, **rotate `DEMO_ACCESS_TOKEN`** — every existing demo
  link/cookie stops working immediately. No code change or redeploy of the app logic
  is needed beyond updating the env var.

## What you get automatically

- The new pool renders in **its own branding and theme**, WCAG-checked.
- Only the **modules you enabled** appear; disabled ones are hidden in nav **and**
  blocked server-side (middleware redirects their routes).
- Ship a new feature to the base app and **every** pool gets it, in its own brand,
  toggleable per pool — because there is one codebase and the difference lives in
  config, never in component code.
