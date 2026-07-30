# Fix 6 — Interactive-control persistence audit

Systematic audit of create/save/delete controls across the app, their persistence
status, and what this pass fixed. Legend:

- **Persist** = the handler writes to Supabase.
- **Reload** = the written row is re-fetched on page load (survives refresh).
- Status: ✅ works end-to-end · ⚠️ writes but needs verification · ❌ local-only (vanishes on refresh)

## Root cause found

Two systemic defects, both fixed this pass:

1. **Inserts omitted `organization_id`** (NOT NULL) — e.g. `repos.chemicals.create`,
   the chat repo, etc. sent no org id, so the insert **failed silently** against
   RLS/NOT NULL. Created data appeared to do nothing / vanish.
   → Fixed by `supabase/org-defaults.sql`: a `BEFORE INSERT` trigger stamps
   `organization_id = current_org_id()` from the caller's JWT on every org-scoped
   table. Creates now land in the correct tenant with no client plumbing.

2. **The loader only re-fetched 6 of 9 persisted slices.** Time-off, trades, and
   shifts were written to the DB but never re-loaded, so they vanished on refresh.
   → Fixed in `supabase-hydrator.tsx`: it now re-fetches messages, channels,
   chemicals, maintenance, notifications, time-clock, **facilities, shifts,
   time-off, and trades**.

## Status after this pass

| Entity / control | Should do | Persist | Reload | Status |
|---|---|---|---|---|
| **Chem log** — "Save reading" | insert reading | ✅ (`chemicals.create`, org via trigger) | ✅ (hydrator) | ✅ |
| **Maintenance** — report / status / assign | insert + update | ✅ (`maintenance.*`) | ✅ | ✅ |
| **Time clock** — clock in/out, break | insert + update | ✅ (`timeClock.*`) | ✅ | ✅ |
| **Time off** — request / approve | insert + update | ✅ (`timeOff.*`) | ✅ (now) | ✅ |
| **Shift trades** — request / approve | insert + update | ✅ (`trades.*`) | ✅ (now) | ✅ |
| **Schedule** — assign / pick up shift | update shift | ✅ (`scheduling.updateShift`) | ✅ (now) | ✅ |
| **Chat** — create group / DM | insert channel + members | ⚠️ (repo sends no org id → trigger fills; member roster read-back needs staff↔profile id join) | channels ✅, members ⚠️ | ⚠️ |
| **Chat** — post message | insert message | ✅ (`chat.postMessage`) | ✅ (+ realtime) | ✅ |
| **Chat** — add/remove member | insert/delete membership | ⚠️ (writes; read-back pending) | ⚠️ | ⚠️ |
| **Chat** — disable-DMs toggle | update org flag | ❌ local-only (`dmsDisabled` in store) | ❌ | ❌ TODO |
| **Facilities** — "Add a facility" | insert facility (+ pool) | ❌ local-only (`addFacility` never calls `facilities.create`) | list ✅, create ❌ | ❌ TODO |
| **Shift reports** — submit / review | insert + update | ❌ local-only (`addReport`, `setReportStatus`) | ❌ | ❌ TODO |
| **Checklists** — complete / template CRUD | insert/update/delete | ❌ local-only | ❌ | ❌ TODO |
| **Patron counts** — add | insert | ❌ local-only (`addPatronCount`) | ❌ | ❌ TODO |
| **Onboarding** — set step | update | ❌ local-only (`setOnboardingStep`) | ❌ | ❌ TODO |
| **Schedule drafts** — build/publish | insert/update | ❌ local-only (`addDraft`/`publishDraft`) | ❌ | ❌ TODO |
| **Members / invites** — add / invite | insert | invite API exists (`/api/invite`); in-app add ❌ | — | ⚠️ partial |
| **Pin message / schedule settings / mark-read** | update | ❌ local-only (UI-state, low stakes) | notifications reload | ⚠️ |

## Remaining work (per-entity, prioritized)

Each ❌ TODO needs the same three steps, now unblocked by the org-id trigger:

1. Add a `repos.<entity>.create/update/delete` (many exist; some need adding).
2. Call it from the store action (drop the local-only `set()` -only path).
3. Re-fetch the slice in the hydrator (add its `list()` + a `hydrate` slice).

Priority order: **facilities → shift reports → checklists → patron counts →
onboarding → schedule drafts → chat member read-back (needs a `channel_members`
→ `staff_profiles` join so a group's roster loads) → chat disable-DMs (needs an
`organizations.dms_disabled` read/update)**.

The infra for all of it (correct tenant id on insert, and reload-on-load) is now in
place; the rest is wiring each entity through it.
