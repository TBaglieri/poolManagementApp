/**
 * Backfill: link existing auth accounts to their staff_profiles row.
 *
 *   npm run link-staff-profiles                 # all tenants, apply
 *   npm run link-staff-profiles -- --dry-run    # report only, change nothing
 *   npm run link-staff-profiles -- --tenant villas
 *
 * Some staff signed up before the auth→staff link existed: they have an auth
 * account (+ profile + org membership) but no staff_profiles row carrying their
 * profile_id, so RLS's current_staff_id() can't resolve them. This matches each
 * org member to an UNLINKED staff row by email (within the same tenant) and writes
 * the auth id onto it. Idempotent — already-linked accounts are skipped, so it's
 * safe to run repeatedly. Unmatched accounts/rows are flagged for manual review.
 *
 * Secrets come ONLY from the environment (SUPABASE_SERVICE_ROLE_KEY).
 */
import { getTenantConfig, planStaffLinks, normalizeEmail, type AuthUserLite, type StaffRowLite } from "@poolops/shared";
import { requireEnv, adminClient, parseArgs } from "./_shared";

async function orgsToProcess(supabase: ReturnType<typeof adminClient>, tenant?: string) {
  const q = supabase.from("organizations").select("id, name, slug");
  const { data, error } = await q;
  if (error) throw new Error(`list organizations failed: ${error.message}`);
  let orgs = (data ?? []) as { id: string; name: string; slug: string | null }[];
  if (tenant) {
    const name = getTenantConfig(tenant).displayName.toLowerCase();
    orgs = orgs.filter((o) => (o.slug ?? "").toLowerCase() === tenant.toLowerCase() || (o.name ?? "").toLowerCase() === name);
    if (!orgs.length) throw new Error(`No organization matched tenant "${tenant}".`);
  }
  return orgs;
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const dryRun = flags["dry-run"] === "true" || flags.dry === "true";
  const tenant = flags.tenant?.trim().toLowerCase();

  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  const supabase = adminClient();

  const orgs = await orgsToProcess(supabase, tenant);
  console.log(`→ Linking staff profiles across ${orgs.length} organization(s)${dryRun ? " (DRY RUN)" : ""}…\n`);

  let totalLinked = 0, totalAlready = 0, totalUnmatchedUsers = 0, totalUnmatchedStaff = 0;

  for (const org of orgs) {
    // The org's real users (auth accounts) — from members joined to their profiles.
    const { data: members } = await supabase
      .from("organization_members").select("profile_id, profiles(id, email)")
      .eq("organization_id", org.id).eq("status", "active");
    const users: AuthUserLite[] = (members ?? []).map((m: any) => ({
      id: m.profile_id, email: m.profiles?.email ?? null,
    }));

    const { data: staffRows } = await supabase
      .from("staff_profiles").select("id, email, profile_id").eq("organization_id", org.id);
    const staff: StaffRowLite[] = (staffRows ?? []).map((r: any) => ({
      id: r.id, email: r.email ?? null, profileId: r.profile_id ?? null,
    }));

    const plan = planStaffLinks(users, staff);
    totalAlready += plan.alreadyLinked.length;
    totalUnmatchedUsers += plan.unmatchedUsers.length;
    totalUnmatchedStaff += plan.unmatchedStaff.length;

    console.log(`• ${org.name}${org.slug ? ` (${org.slug})` : ""}: ${plan.links.length} to link, ${plan.alreadyLinked.length} already linked`);

    for (const link of plan.links) {
      if (dryRun) { console.log(`    would link staff ${link.staffId} → ${link.profileId}`); totalLinked++; continue; }
      const { error } = await supabase.from("staff_profiles")
        .update({ profile_id: link.profileId, employment_status: "active" }).eq("id", link.staffId);
      if (error) { console.warn(`    ✖ link ${link.staffId} failed: ${error.message}`); continue; }
      totalLinked++;
    }

    for (const u of plan.unmatchedUsers) {
      console.warn(`    ! no staff row for user ${u.id} <${normalizeEmail(u.email) || "no-email"}> — review manually`);
    }
    for (const r of plan.unmatchedStaff) {
      console.warn(`    ! reserved staff row ${r.id} <${normalizeEmail(r.email) || "no-email"}> has no matching account yet`);
    }
  }

  console.log(`\n${dryRun ? "Would link" : "Linked"} ${totalLinked} staff profile(s). ${totalAlready} already linked.`);
  if (totalUnmatchedUsers || totalUnmatchedStaff) {
    console.log(`Flagged for review: ${totalUnmatchedUsers} account(s) with no staff row, ${totalUnmatchedStaff} reserved row(s) with no account.`);
  }
  if (dryRun) console.log("(dry run — no changes written)");
}

main().catch((e) => { console.error(e); process.exit(1); });
