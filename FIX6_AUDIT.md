# Fix 6 — Interactive-control persistence audit

Systematic audit of create/save/delete controls across the app, their persistence
status, and what this pass fixed. Legend:

- **Persist** = the handler writes to Supabase.
- **Reload** = the written row is re-fetched on page load (survives refresh).
- Status: ✅ works end-to-end · ⚠️ writes but needs verification · ❌ local-only (vanishes on refresh)

## Root cause found

Three systemic defects, all fixed:

0. **Actor columns referenced `profiles(id)` (the auth user) but got `staff_profiles.id`.**
   `chemical_logs.recorded_by`, `maintenance_issues.reported_by`, `messages.sender_id`,
   `channels.created_by`, etc. So even chem logs — thought to persist — were failing the
   FK silently (and `messages_post` RLS needs `sender_id = auth.uid()`).
   → Fixed by `supabase/insert-actor.sql`: a `BEFORE INSERT` trigger defaults each actor
   column to `auth.uid()` when the client omits it. The clients now omit those columns,
   so rows persist with the correct actor and RLS passes. A `channels` AFTER-INSERT
   trigger also adds the creator to `channel_members`, so a new chat is visible to its
   creator on reload.

Plus:

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
| **Chat** — create group / DM | insert channel (+ creator member via trigger) | ✅ (org id + created_by + creator membership via triggers) | creator ✅, other members ⚠️ | ⚠️ |
| **Chat** — post message | insert message | ✅ (sender_id via trigger; RLS passes) | ✅ (+ realtime) | ✅ |
| **Chat** — add/remove OTHER member | insert/delete membership | ⚠️ needs staff_id→profile_id (roster carries profile_id) | ⚠️ | ⚠️ TODO |
| **Chat** — disable-DMs toggle | update org flag | ❌ local-only (`dmsDisabled` in store) | ❌ | ❌ TODO |
| **Facilities** — "Add a facility" | insert facility (+ pool) | ✅ (`facilities.create` + `createPool`) | ✅ (hydrator) | ✅ |
| **Shift reports** — submit / review | insert + update | ✅ (`reports.create/update`) | ✅ | ✅ |
| **Checklists** — complete | insert | ✅ (`checklists.create`) | ✅ | ✅ |
| **Patron counts** — add | insert | ✅ (`patron.create`) | ✅ | ✅ |
| **Checklist templates** — CRUD | insert/update/delete | ❌ local-only (items live in a 2nd table) | ❌ | ❌ TODO |
| **Onboarding** — set step | update | ❌ local-only (needs a (staff,step) upsert key) | ❌ | ❌ TODO |
| **Schedule drafts** — build/publish | insert/update | ❌ local-only (multi-table drafts) | ❌ | ❌ TODO |
| **Members / invites** — add / invite | insert | invite API exists (`/api/invite`); in-app add ❌ | — | ⚠️ partial |
| **Chat disable-DMs toggle** | update org flag | ❌ local-only (needs org read on load) | ❌ | ❌ TODO |
| **Pin message / schedule settings / mark-read** | update | ❌ local-only (UI-state, low stakes) | notifications reload | ⚠️ |

### Newly persisted this pass
Facilities (+ pool), shift reports (submit + review), patron counts, and checklist
completions now write to Supabase and reload on refresh. A Vitest suite
(`store-persistence.test.ts`) asserts each of these controls calls the DB (no
no-ops). Attribution columns that reference `profiles(id)` (patron `recorded_by`,
checklist `completed_by`) are omitted so the row persists — the app attributes by
`staff_profiles.id`, so wiring true actor attribution needs the staff↔profile
resolution noted below.

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
