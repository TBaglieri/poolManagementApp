# Performance — PoolOps Pro

Goal: dashboard navigation should feel near-instant, not like a full page reload.

## What was optimized

### 1. Persistent app shell (no remount on navigation)
The dashboard uses a Next.js **route group** `app/(app)/layout.tsx` that renders `<AppShell>` once. Sidebar, top bar, demo banner, and the Supabase hydrator stay mounted across page changes — only the page body swaps. Switching tabs does **not** rebuild the shell.

### 2. Client-side store caching (no refetch per tab)
Organization, role, profile, navigation, and facility data come from cached client stores:
- `useSession` (zustand + localStorage) — role, mode, org, facility. Persisted, so it survives reloads and never refetches on tab switch.
- `useDemo` (zustand) — operational data (chat, chemicals, maintenance, clock, etc.), hydrated **once** from Supabase by `SupabaseHydrator` on app load, not on every page.
- `getCurrentUserContext()` resolves user/org/role from cached session first.

Tab switches read from these in-memory stores — no network round-trip.

### 3. Code-split heavy charts (Recharts)
Recharts (~200 kB) is lazy-loaded via `components/charts/charts-lazy.tsx` using `next/dynamic` with `ssr: false` and skeleton fallbacks. Dashboard / Reports / Patron Counts / Chemicals render instantly with a skeleton, then hydrate the chart. This dropped those pages' First Load JS by ~60–70 kB each.

### 4. Link prefetching
Sidebar uses Next `<Link>` (prefetches routes in the viewport in production builds). Marketing anchors that pointed to in-app routes were already `<Link>`. Active nav state is derived from `usePathname` without heavy re-renders.

### 5. Route transition feedback
`components/shell/route-progress.tsx` shows a subtle top progress bar on every route change so clicks feel responsive even before content paints. No blank-screen freeze.

### 6. Skeletons & non-blocking data
Charts use skeletons; pages render their static cards immediately and let slower/optional panels fill in. The Supabase hydrator runs in the background and only **replaces** a store slice when Supabase actually returns rows — the UI never blocks waiting for it.

### 7. Scoped, minimal Supabase queries
Repositories (`apps/web/src/lib/repos`) select per-table, order/limit where needed, and are designed to scope by `organization_id`. The schema adds indexes on `organization_id`, `facility_id`, `status`, and `created_at` (see `supabase/schema.sql`) for fast filters.

### 8. Optimistic UI
Chat posts, time-clock punches, chemical logs, and maintenance reports update the local store immediately and persist to Supabase in the background (write-through), so they feel instant.

## How to test navigation speed

1. `npm run dev:web` (or `npm run build:web && npm run start:web` for production timings).
2. Sign in (demo: any role; or real Supabase). 
3. Click rapidly between **Dashboard → Facilities → Staff → Schedule → Chat → Time Clock → Payroll → Chemicals → Maintenance → Reports → Settings**.
   - The sidebar/top bar stay put (no flash).
   - A thin progress bar flashes at the top.
   - Chart pages show a skeleton, then the chart — they no longer block.
4. Compare First Load JS in the build output: chart pages are ~270–280 kB (down from ~340 kB); non-chart pages ~120–160 kB.

## Notes / further wins
- `@supabase/supabase-js` is in the shared app bundle (needed for supabase mode). Marketing pages (`/`, `/pricing`) stay light because they don't import it.
- For very large orgs, paginate big tables (Staff, Time Clock) and add `select('only,needed,columns')` per query.
- Consider TanStack Query for server-state caching/revalidation if you move fully to live Supabase reads on every page.
