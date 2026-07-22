# DECISIONS.md — Architecture + judgment calls (run unattended)

Every decision made without you, with the alternative and the reasoning. Bias
was toward **reversible, additive, non-breaking** changes (per section 10 of the
brief).

---

## D0. Tenant = Organization

The DB and domain model are already multi-tenant on **Organization** (`organization_id`
on every table, RLS-enforced). I did **not** introduce a parallel "tenant" table.
A tenant config is an **extension** of an organization: identity + branding + copy +
feature flags + operational settings + theme + role labels.

- **Storage (mock mode / demo):** tenant configs are **data records** in a static
  registry (`packages/shared/src/tenant/registry.ts`) keyed by slug. This is not a
  per-tenant code branch — it is exactly the "every tenant is a configuration record"
  requirement, just sourced from code-as-data for the offline demo.
- **Storage (supabase mode):** an **additive** migration adds a single
  `organizations.config jsonb` column (`supabase/tenant-config.sql`,
  `add column if not exists` — safe, non-destructive, backfilled from the registry).
  The client falls back to the registry if the column/row is absent, so **nothing
  requires the migration to run** for the demo to work.
- **Why a jsonb blob, not 40 columns:** additive, versionable, validated by one Zod
  schema, and doesn't churn the schema every time we add a branding field.

## D1. Zod for the typed config

Installed `zod@3.23.8` into `packages/shared`. A malformed config fails loudly at
load via `TenantConfigSchema.parse`, per the brief. Pure TS, no React — so the
schema and all theme/flag logic are unit-testable under vitest (Node).

## D2. Theming via CSS variables that Tailwind already reads

- `tailwind.config.ts` `brand.*` and `navy.*` now resolve to
  `rgb(var(--brand-500) / <alpha-value>)` etc. **Every existing `bg-brand-500`,
  `text-navy-900`, ring, gradient keeps working unchanged** — it now just reads a CSS
  variable.
- **Default variable values equal today's exact hex** (converted to `R G B` triplets),
  so with no tenant override the app is pixel-identical to before. This is the key
  non-breaking move.
- A `ThemeInjector` emits a `<style>` block at the app root setting `--brand-*`,
  `--navy-*`, `--radius`, `--density`, and light/dark surface vars from the resolved
  tenant config + the user's light/dark preference.
- **Scope decision:** I tokenized the two **brand** scales (`brand`, `navy`) — where
  tenant identity actually lives — plus radius/density and semantic surface vars. I
  deliberately left the neutral **slate** scale and semantic status colors
  (rose/amber/emerald for danger/warn/success) as fixed tokens. Rationale: those carry
  meaning, not brand; making red configurable per tenant invites unreadable/inconsistent
  status UI, and slate is a neutral that reads well under any brand. This satisfies "no
  hardcoded brand color in components" without over-tokenizing. _Alternative considered:_
  tokenize literally every color → rejected as high-risk churn across 58 files for
  little benefit.

## D3. Accessible palette generation + WCAG AA

`tenant/theme.ts` derives a full 50–950 tint/shade scale from a single brand hex
(and secondary/accent), computes WCAG contrast ratios, and **auto-adjusts** the
on-surface text token until it clears **AA (4.5:1)**, returning a warning list the
admin UI surfaces rather than shipping unreadable text. Unit-tested.

## D4. Feature flags as a module registry

`tenant/modules.ts` defines `MODULES` (chemicals, scheduling, timeclock, chat,
maintenance, guest passes/reservations, documents, announcements, billing, reporting,
…), each with id, label, the nav hrefs it owns, the permissions it needs, default
on/off, and optional sub-features (e.g. `chat.directMessages`). A module registers
itself here; nav + routes + seed derive from it — add a module by adding one entry.

- **Client:** `useFeature('chat')` / `useFeature('chat','directMessages')`.
- **Server:** `isFeatureEnabled(config, id)` + **middleware** that 404s a disabled
  module's routes (real server-side gating against the registry, not just client hiding).
- Disabled module → nav entry hidden, route blocked, data fetch skipped. Degrades
  gracefully (no broken links to disabled areas).

## D5. Role labels configurable, permissions fixed

`TenantConfig.roleLabels: Partial<Record<RoleSlug,string>>` overrides the **display
label** only ("Board" vs "HOA Committee"); the underlying permission set is unchanged
and still enforced centrally. `resolveRoleLabel(config, slug)` + `useRoleLabel`.

## D6. Persistence of admin edits

- **Mock mode:** admin edits save to a `localStorage` tenant override and live-update
  the theme. Fully reversible ("Reset to defaults" clears it). Chosen because it's the
  most reversible option and needs no DB write while you're away.
- **Supabase mode:** the admin "Save" also upserts `organizations.config` when the
  column exists; if not, it stays local and tells you to run the additive migration.
  No destructive DB action is taken unattended.

## D7. Tenant resolution order

`middleware.ts` resolves the active tenant slug from, in order: `?tenant=` query
(dev override) → `NEXT_PUBLIC_TENANT` env → subdomain (`villas.myapp.com` → `villas`,
primary mechanism) → custom-domain map → default (`villas` for this trial deployment,
falling back to the platform default config). It sets an `x-tenant-slug` header +
cookie the server and client both read. Custom domains are a stub map ready to fill in.

## D8. Villas on the Ridge default theme — "Hudson Slate & Water"

Picked a calm, professional palette (see the justifying comment in `tenant/presets.ts`):
a **deep Hudson-water teal-blue primary** with a **warm sandstone/stone secondary** and
**slate neutrals** — evokes the Hudson River + Hudson Valley stone, reads as trustworthy
to a residential condo board, and is the opposite of a neon SaaS dashboard. All
text-on-surface pairs verified ≥ AA. Three more one-click presets ship alongside
(Coastal, Modern Navy, Warm Resort, plus a High-Contrast utility look).

## D9. Animations: CSS-driven, no new heavy deps

Did **not** add framer-motion. Extended the existing Tailwind keyframes + a shared
`Button` and new skeleton/splash/loading primitives. Everything respects
`prefers-reduced-motion`. Rationale: keep the bundle light and the change low-risk;
the app already animates with CSS.

## D10. What I did NOT do (kept scope honest)

- Did not touch `apps/mobile` or `app/m/*` (brief: web only).
- Did not rewrite any working feature module.
- Did not change auth or RLS semantics, or run any destructive migration, while away.
- Did not wire real Stripe, uploads-to-storage, email/SMS — out of scope, noted in
  `HANDOFF.md`.

See `HANDOFF.md` for what's done vs. shaky and the exact run/seed commands.
