/**
 * Verify which Supabase migrations are applied — by PROBING the live database with
 * the service-role key (not by trusting notes). Reports which project it's pointed
 * at, then checks each migration's detectable marker.
 *
 *   npm run verify-setup
 *
 * NOTE: the service role BYPASSES RLS, so RLS policies and the signup trigger can't
 * be seen from here — run supabase/verify-setup.sql in the SQL Editor for those.
 */
import { requireEnv, adminClient } from "./_shared";

type Status = "OK" | "MISSING" | "EMPTY" | "?";

async function tableExists(sb: ReturnType<typeof adminClient>, table: string): Promise<Status> {
  const { error } = await sb.from(table).select("*", { head: true, count: "exact" }).limit(1);
  if (!error) return "OK";
  if (/does not exist|Could not find the table|PGRST205|42P01/i.test(error.message)) return "MISSING";
  return "OK"; // other errors (RLS etc.) still mean the table exists
}

async function columnExists(sb: ReturnType<typeof adminClient>, table: string, col: string): Promise<Status> {
  const { error } = await sb.from(table).select(col).limit(1);
  if (!error) return "OK";
  if (/column .* does not exist|Could not find the .* column|42703|PGRST204/i.test(error.message)) return "MISSING";
  if (/does not exist|PGRST205|42P01/i.test(error.message)) return "MISSING"; // table itself missing
  return "OK";
}

async function rowExists(sb: ReturnType<typeof adminClient>, table: string, filter: (q: any) => any): Promise<Status> {
  const { data, error } = await filter(sb.from(table).select("id")).limit(1);
  if (error) return "?";
  return data && data.length ? "OK" : "EMPTY";
}

async function main() {
  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ref = url.replace(/^https?:\/\//, "").split(".")[0];
  const sb = adminClient();

  console.log(`\nSupabase project: ${ref}  (${url})`);
  console.log("Confirm this is the SAME project your deployed site authenticates against.\n");

  const rows: { check: string; migration: string; status: Status }[] = [];
  const push = (check: string, migration: string, status: Status) => rows.push({ check, migration, status });

  // schema.sql — core tables.
  for (const t of ["organizations", "profiles", "roles", "staff_profiles", "organization_members",
                   "facilities", "chemical_logs", "shift_reports", "pay_periods", "staff_invitations"]) {
    push(`table ${t}`, "schema.sql", await tableExists(sb, t));
  }
  // seed.sql — roles must be seeded (memberships FK to them).
  push("roles seeded (rows present)", "seed.sql", await rowExists(sb, "roles", (q) => q));

  // tenant-config.sql — slug + config columns, and the Villas org.
  push("organizations.slug column", "tenant-config.sql", await columnExists(sb, "organizations", "slug"));
  push("organizations.config column", "tenant-config.sql", await columnExists(sb, "organizations", "config"));
  push("Villas org row (slug=villas)", "tenant-config.sql", await rowExists(sb, "organizations", (q) => q.eq("slug", "villas")));

  // staff-auth-link.sql — email column on staff_profiles.
  push("staff_profiles.email column", "staff-auth-link.sql", await columnExists(sb, "staff_profiles", "email"));

  // chem-taken-at.sql — taken_at column.
  push("chemical_logs.taken_at column", "chem-taken-at.sql", await columnExists(sb, "chemical_logs", "taken_at"));

  // Report.
  const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);
  const icon = (s: Status) => (s === "OK" ? "✓" : s === "MISSING" ? "✗" : s === "EMPTY" ? "•" : "?");
  console.log(pad("  CHECK", 40) + pad("MIGRATION", 24) + "STATUS");
  console.log("  " + "─".repeat(68));
  for (const r of rows) console.log(pad(`  ${icon(r.status)} ${r.check}`, 40) + pad(r.migration, 24) + r.status);

  const missing = rows.filter((r) => r.status === "MISSING");
  console.log("");
  if (missing.length) {
    console.log(`✗ ${missing.length} marker(s) MISSING → run: ${[...new Set(missing.map((m) => m.migration))].join(", ")}`);
  } else {
    console.log("✓ All API-checkable markers are present.");
  }
  console.log("\nNOT checkable from here (service role bypasses RLS): the auth→profile TRIGGER,");
  console.log("and RLS POLICIES from rls-policies.sql / shift-reports-rls.sql / rls-gaps.sql.");
  console.log("→ Run supabase/verify-setup.sql in the Supabase SQL Editor for those.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
