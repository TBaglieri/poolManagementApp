# Security — PoolOps Pro

PoolOps Pro handles staff PII, tax documents, payroll data, and minors' information. This document captures the security posture, required hardening, and compliance notes. **Read this before connecting a live backend or shipping.**

## 🔴 Immediate action: rotate the exposed Supabase key

A Supabase **service role key** was exposed earlier in development. The service role key **bypasses Row Level Security** and has full database access.

1. Supabase dashboard → **Project Settings → API → Service role → Reset / Regenerate**.
2. Paste the new key into `apps/web/.env.local` as `SUPABASE_SERVICE_ROLE_KEY` (git-ignored).
3. In production, store it in your hosting provider's secret manager — never in git or client code.

The repo only ever contains a **placeholder** for `SUPABASE_SERVICE_ROLE_KEY`.

## Secrets management

- **Never commit** `.env`, `.env.local`, `.env.*.local`, or any real secret. These are git-ignored.
- Only the **publishable / anon** Supabase key and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` may reach the browser/mobile bundle.
- Server-only secrets: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Read these only in server code (`packages/supabase/src/admin.ts`, API routes).
- The service-role admin client must never be imported by `"use client"` components, the mobile app, or anything bundled for the browser.

## Sensitive documents (tax / I-9 / SSN)

- Tax documents (W-4, I-9), SSNs, and direct-deposit info are **highly sensitive PII**.
- Store them in **private** Supabase Storage buckets only (`supabase/storage.sql`). Never make these buckets public.
- Serve files via **short-lived signed URLs** generated server-side — never long-lived public URLs.
- Do **not** store SSNs or I-9 contents in plaintext columns. Encrypt at rest beyond Supabase defaults where required by your compliance regime.
- The document library (`/documents`) filters sensitive items by role in the UI; the **real** gate is the RLS policy on `documents` and storage policies.

## Authorization: RBAC + RLS

- The UI permission map (`packages/shared/src/rbac/permissions.ts`) is for **convenience only**. Never trust the client for authorization.
- **RLS is the real boundary.** Every privileged read/write must be enforced by Row Level Security in Postgres (`supabase/rls-policies.sql`).
- The provided policies are a **starter** set. Before production you must:
  - Review every table's policies for least privilege.
  - Test each role against each table (positive and negative cases).
  - Restrict the `staff_profiles.pay_rate` column (use a column-level grant or a view) so non-payroll roles can't read pay.
  - Confirm lowest-level staff can only act on **their own** rows (time off, time clock, onboarding, trades).
  - Confirm payroll/tax tables are readable only by payroll/admin roles.

## User invitations & delegated management

- The invite/admin-create endpoint (`/api/admin/invite-user`) runs **server-side only** and uses the service-role admin client. It **must validate the caller's permission** before creating users — it checks the caller is authenticated and that their `organization_members.role_slug` is allowed to invite. Lowest-level staff (lifeguard) can never invite.
- **Hierarchy rule:** a user cannot grant a role or management permission higher than their own. Only Organization Admin / Super Admin may grant full administrative access. The invite UI enforces this (role list filtered by level; management toggles admin-only), and RLS + the server route must enforce it for real.
- Deactivating a user removes access but retains historical records (shifts, logs, payroll) — never hard-delete audit-relevant rows.
- `staff_invitations` tokens should be stored hashed (`token_hash`) in production; treat invite links as secrets with short expiry.

## Audit logging

- Sensitive actions (viewing payroll, accessing tax docs, publishing schedules, exporting data) should write to `audit_logs`.
- Audit logs are admin-readable only and should be tamper-resistant (append-only; consider a separate retention policy).

## Lowest-level staff restrictions (must hold server-side)

Lowest-level staff (lifeguards) may **only**: view own schedule, clock in/out for themselves, request time off, request shift trades, complete their onboarding, complete assigned checklists, read All Team chat/announcements, report maintenance issues, and view their own profile.

They must **not**: view payroll, view tax forms, view other staff's private info, edit facilities, manage or publish schedules, generate auto schedules, manage certifications globally, view admin reports, or access admin settings. Verify this in RLS, not just the UI.

## Payroll & tax compliance

- Payroll exports, overtime handling, and minor labor rules need **legal/accounting review** for each jurisdiction.
- Under-18 ("minor") scheduling warnings in the Auto Builder are **placeholders** — confirm against state child-labor laws before relying on them.
- Tax filing, W-2/1099 generation, and direct deposit require a compliant payroll provider integration.

## Mobile / App Store release

- A real App Store / Play Store release requires a **privacy policy**, developer accounts, and data-handling disclosures (PII, minors).
- The mobile app must use only `EXPO_PUBLIC_*` env vars (anon key) — never embed secrets.

## Hosting & credentials

- Store Supabase and Stripe credentials in your hosting provider's **environment/secret manager** (e.g. Vercel project env vars), not in the repo.
- Rotate keys on any suspected exposure.
- Enable Supabase Auth with email confirmation; consider MFA for admin roles.

## Reporting

This is a demonstration project. For a production deployment, establish a security contact and a responsible-disclosure process before launch.
