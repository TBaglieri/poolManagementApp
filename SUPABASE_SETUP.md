# Supabase Setup — PoolOps Pro

PoolOps Pro runs in two data modes:

- **`mock`** (default) — fully working app powered by bundled demo data. No backend required.
- **`supabase`** — web + mobile read/write a shared Supabase Postgres backend with Row Level Security and Realtime.

You can build, demo, and test everything in **mock mode**. Follow this guide to wire up the live Supabase backend.

> ⚠️ **Security first.** A Supabase service role key was exposed earlier in development. **Rotate it before doing anything else** (Step 3). Never commit `.env*` files or the service role key. See [SECURITY.md](./SECURITY.md).

---

## 1. Create / open the Supabase project

This project is configured for:

```
Project URL:  https://bqhhbekmqsmfkxyzdvol.supabase.co
Anon key:     sb_publishable_DBaasd3KSY392tsSUy3wQQ_VFE3EM_a   (publishable — safe in the browser)
```

1. Go to <https://supabase.com/dashboard> and open the project (or create a new one).
2. Confirm the **Project URL** matches above. Use the base URL — **not** the `/rest/v1` endpoint.

## 2. Add environment variables

**Web** — copy `apps/web/.env.example` → `apps/web/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://bqhhbekmqsmfkxyzdvol.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_DBaasd3KSY392tsSUy3wQQ_VFE3EM_a
SUPABASE_SERVICE_ROLE_KEY=PASTE_ROTATED_SERVICE_ROLE_KEY_HERE
NEXT_PUBLIC_DATA_MODE=supabase
```

**Mobile** — copy `apps/mobile/.env.example` → `apps/mobile/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://bqhhbekmqsmfkxyzdvol.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_DBaasd3KSY392tsSUy3wQQ_VFE3EM_a
EXPO_PUBLIC_DATA_MODE=supabase
```

Both files are git-ignored.

## 3. Rotate & paste the service role key (server-only)

1. In the dashboard: **Project Settings → API → Service role key → Reset/Regenerate**.
2. Copy the **new** key.
3. Paste it into `apps/web/.env.local` as `SUPABASE_SERVICE_ROLE_KEY`.
4. In production, store it in your hosting provider's secret manager (Vercel/Netlify env vars) — **never** in client code or git.

The service role key is read **only** in `packages/supabase/src/admin.ts` (server-only) and **bypasses RLS**. It must never reach the browser or mobile bundle.

## 4. Run `schema.sql`

Dashboard → **SQL Editor → New query** → paste the contents of [`supabase/schema.sql`](./supabase/schema.sql) → **Run**.

Creates all tables, indexes, foreign keys, and `updated_at` triggers. Safe to re-run.

## 5. Run `rls-policies.sql`

SQL Editor → new query → paste [`supabase/rls-policies.sql`](./supabase/rls-policies.sql) → **Run**.

Enables RLS on every app table and installs starter policies (org isolation, self-service for lowest-level staff, payroll/HR restrictions, sensitive-document gating).

> These are **starter** policies. Review and harden before production.

## 6. Run `realtime.sql`

SQL Editor → new query → paste [`supabase/realtime.sql`](./supabase/realtime.sql) → **Run**.

Adds the chat, scheduling, time-clock, and operations tables to the `supabase_realtime` publication.

## 7. Run `storage.sql`

SQL Editor → new query → paste [`supabase/storage.sql`](./supabase/storage.sql) → **Run**.

Creates six **private** buckets and their access policies.

## 8. (Optional) Run `seed.sql`

SQL Editor → new query → paste [`supabase/seed.sql`](./supabase/seed.sql) → **Run**.

Seeds reference data (roles, permissions, plans, certifications) and one demo organization with facilities and channels.

## 9. Enable the Auth email provider

Dashboard → **Authentication → Providers → Email** → enable. Configure confirmation emails as desired. (The demo login uses a mock role switcher; real Supabase Auth is wired for production via `@supabase/ssr`.)

## 10. Create / verify storage buckets

`storage.sql` creates the buckets. Verify under **Storage**: `staff-documents`, `certifications`, `maintenance-photos`, `inspection-photos`, `profile-avatars`, `organization-assets` — all **private**.

## 11. Enable Realtime in the dashboard

`realtime.sql` handles this, but you can verify/adjust under **Database → Replication → `supabase_realtime`**. Confirm the scheduling, messages, and notifications tables are listed.

## 12. Test web ↔ mobile shared updates

1. Set `NEXT_PUBLIC_DATA_MODE=supabase` (web) and `EXPO_PUBLIC_DATA_MODE=supabase` (mobile).
2. Start the web app (`npm run dev:web`). The top-bar sync chip should read **“Live sync”** (green).
3. Insert a row in Supabase (e.g. a `messages` row in the All Team channel).
4. Confirm it appears in the chat view, and that a parallel client (second browser / mobile) receives it via the realtime subscription.

## 13. Switch between mock and Supabase mode

| Mode       | Web env                              | Mobile env                          |
|------------|--------------------------------------|-------------------------------------|
| Mock       | `NEXT_PUBLIC_DATA_MODE=mock`         | `EXPO_PUBLIC_DATA_MODE=mock`        |
| Supabase   | `NEXT_PUBLIC_DATA_MODE=supabase`     | `EXPO_PUBLIC_DATA_MODE=supabase`    |

If `supabase` is requested but env vars are missing/invalid, the app **automatically falls back to mock** and the sync chip shows **“Setup needed”**. Logic lives in `packages/supabase/src/config.ts` (`getEffectiveDataMode`).

## Realtime subscription helpers

Shared between web and mobile in `packages/supabase/src/realtime.ts`:

`subscribeToMessages`, `subscribeToAnnouncements`, `subscribeToScheduleChanges`, `subscribeToScheduleDrafts`, `subscribeToScheduleDraftShifts`, `subscribeToSchedulePublishEvents`, `subscribeToShiftAssignments`, `subscribeToTimeOffRequests`, `subscribeToShiftTradeRequests`, `subscribeToClockStatus`, `subscribeToFacilityStatus`, `subscribeToMaintenanceIssues`, `subscribeToChemicalLogs`, `subscribeToChecklistCompletions`, `subscribeToNotifications`.

Each returns a `RealtimeChannel` (or `null` in mock/unconfigured mode). Always clean up with `client.removeChannel(ch)`.

## Web + Mobile Sync

The web dashboard and the phone app share **one** Supabase project, so a change on one surface appears on the other.

### 1. Web env vars (`.env.local`, repo root or `apps/web/`)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only
NEXT_PUBLIC_DATA_MODE=supabase
```

### 2. Mobile env vars (`apps/mobile/.env`)
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_DATA_MODE=supabase
```

### 3. Why mobile never uses the service role key
The service role key **bypasses RLS** and is server-only. The mobile app (and all browser code) use only the **anon/publishable** key; access is enforced by RLS. The admin client (`packages/supabase/src/admin.ts`) is imported only by server route handlers (e.g. `/api/admin/invite-user`).

### 4. Tables that sync between web and mobile
`organizations`, `organization_members`, `profiles`, `roles`, `facilities`, `staff_profiles`, `staff_invitations`, `shifts`, `shift_assignments`, `schedule_drafts`, `schedule_publish_events`, `time_off_requests`, `shift_trade_requests`, `channels`, `messages`, `announcements`, `notifications`, `time_clock_entries`, `maintenance_issues`, `chemical_logs`, `checklist_completions`.

### 5. Enable realtime
Run `supabase/realtime.sql` (adds the tables above to the `supabase_realtime` publication). Reusable subscription helpers live in `packages/supabase/src/realtime.ts` and are shared by web + mobile: `subscribeToMessages`, `subscribeToAnnouncements`, `subscribeToScheduleChanges`, `subscribeToScheduleDrafts`, `subscribeToSchedulePublishEvents`, `subscribeToShiftAssignments`, `subscribeToTimeOffRequests`, `subscribeToShiftTradeRequests`, `subscribeToClockStatus`, `subscribeToFacilityStatus`, `subscribeToMaintenanceIssues`, `subscribeToChemicalLogs`, `subscribeToChecklistCompletions`, `subscribeToNotifications`, `subscribeToStaffInvitations`, `subscribeToRoleChanges`.

### 6. Test web → mobile schedule publish
1. Web (manager): Scheduling → Auto Builder → Generate → **Approve & publish**.
2. This writes `shifts`/`shift_assignments`, a `schedule_publish_events` row, `notifications`, and an All-Team `messages` row.
3. Phone (staff): open **My Schedule** and **All Team** — the published shifts + announcement appear (on refresh, or instantly with realtime).

### 7. Test mobile → web clock-in
1. Phone (staff): **Clock** → Clock In → writes `time_clock_entries`.
2. Web (manager/payroll): **Time Clock** / **Payroll** shows the live clock-in.

### 8. Test chat both ways
Post in **All Team** on web → appears on phone; post on phone → appears on web. Backed by `messages` (+ realtime).

### 9. Test maintenance issue sync
Phone: **Report Issue** → writes `maintenance_issues`. Web: **Maintenance** shows it; status changes on web reflect on phone.

### 10. Test checklist sync
Phone: **Checklists** → complete → writes `checklist_completions`. Web: **Checklists** dashboard shows the completion.

> In the current build, web and the in-app mobile preview (`/m/*`) share the same Supabase-hydrated store, so these flows work across surfaces once the schema is applied. The Expo app (`apps/mobile`) uses the same anon key + tables; port the `/m/*` screens to React Native to ship native.

## Security warnings

- **Rotate the exposed service role key** before connecting (Step 3).
- Never commit `.env`, `.env.local`, or any secret.
- Tax forms / I-9 / SSNs are **sensitive** — keep documents in private buckets and serve via short-lived **signed URLs**.
- RLS is the real authorization boundary. The UI permission map is convenience only — test policies thoroughly.
- Add audit logging for sensitive actions (payroll, document access) — see the `audit_logs` table.
