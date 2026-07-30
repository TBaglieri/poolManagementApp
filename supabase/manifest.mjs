/**
 * PoolOps Pro — Supabase SQL manifest (the SINGLE source of truth for order).
 *
 * Every SQL file is idempotent (IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS),
 * so applying the list top-to-bottom is safe to re-run. Both the apply script
 * (scripts/apply-supabase-sql.mjs) and the bundle generator (scripts/build-run-all.mjs)
 * read this list, so there is exactly one place to change the setup order.
 *
 * Phases:
 *   setup  — schema, auth, RLS, storage, realtime, chat, additive migrations. The
 *            required DDL/policies for the app (incl. team chat) to work. Always run.
 *   seed   — sample/tenant data. OPTIONAL — skip on a project that already has real
 *            data (only add with --with-seed).
 *   harden — organizations.slug UNIQUE + NOT NULL. Runs AFTER seeds so every org row
 *            (incl. any just-seeded) already has a routable slug (it backfills the
 *            known tenants by name, then fails loudly on any remaining null slug).
 *   verify — read-only setup check. OPTIONAL (only with --verify).
 *
 * Ordering rules encoded below (see each file's header for the "Run AFTER" note):
 *   • schema first.
 *   • rls-policies before storage / rls-gaps / shift-reports-rls / chat (they use its
 *     helper functions or policies).
 *   • auth-profile-trigger before staff-auth-link.
 *   • tenant-config (adds the slug column + creates the Villas org) before harden.
 *   • harden last of the DDL, after any seeds.
 */
export const MANIFEST = [
  // ---- setup: required for the app (including team chat) to work ----
  { file: "schema.sql",                    phase: "setup",  desc: "Tables, types, indexes, triggers" },
  { file: "auth-profile-trigger.sql",      phase: "setup",  desc: "Create a profile row on auth signup" },
  { file: "tenant-config.sql",             phase: "setup",  desc: "organizations.slug + config; seed Villas org" },
  { file: "rls-policies.sql",              phase: "setup",  desc: "Row-level security + helper functions" },
  { file: "org-defaults.sql",              phase: "setup",  desc: "Auto-stamp organization_id on insert (persistence)" },
  { file: "rls-gaps.sql",                  phase: "setup",  desc: "Additional RLS coverage" },
  { file: "shift-reports-rls.sql",         phase: "setup",  desc: "RLS for shift reports" },
  { file: "chat.sql",                      phase: "setup",  desc: "Team chat: group/DM columns, membership + RLS, realtime" },
  { file: "storage.sql",                   phase: "setup",  desc: "Private buckets + storage policies" },
  { file: "realtime.sql",                  phase: "setup",  desc: "Realtime publication (messages, channels, …)" },
  { file: "staff-auth-link.sql",           phase: "setup",  desc: "Link staff_profiles to auth users" },
  { file: "chem-taken-at.sql",             phase: "setup",  desc: "chemical_logs.taken_at column" },

  // ---- seed: OPTIONAL sample/tenant data (only with --with-seed) ----
  { file: "seed.sql",                      phase: "seed",   desc: "Demo org + sample dataset" },
  { file: "seed-villas.sql",               phase: "seed",   desc: "Villas on the Ridge tenant data" },

  // ---- harden: after seeds, so every org has a routable slug ----
  { file: "organizations-slug-constraint.sql", phase: "harden", desc: "organizations.slug UNIQUE + NOT NULL" },

  // ---- verify: OPTIONAL read-only setup check (only with --verify) ----
  { file: "verify-setup.sql",              phase: "verify", desc: "Read-only: confirm objects exist" },
];

/** Files to apply for a given selection. `setup`+`harden` always; seeds/verify opt-in. */
export function filesFor({ withSeed = false, verify = false } = {}) {
  return MANIFEST.filter((m) =>
    m.phase === "setup" ||
    m.phase === "harden" ||
    (withSeed && m.phase === "seed") ||
    (verify && m.phase === "verify"),
  );
}
