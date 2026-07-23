/**
 * Review (and optionally fix) accounts that may have been given ADMIN by the invite
 * privilege-escalation bug (see AUDIT.md). A user is FLAGGED when they currently hold
 * an admin role but their accepted invitation asked for a NON-admin role — i.e. they
 * were invited as (say) a Lifeguard yet ended up an Admin.
 *
 *   npm run review-invite-roles                 # report only (default) — changes nothing
 *   npm run review-invite-roles -- --tenant villas
 *   npm run review-invite-roles -- --fix        # demote ONLY the flagged mismatches
 *
 * NEVER mass-demotes: report-only by default, and even with --fix it touches only
 * users whose invitation proves they should not be admin, never legitimately-
 * provisioned admins (create-admin, or anyone invited AS an admin), and never the
 * last admin of a tenant. Prints every change. Secrets come from the environment.
 */
import { getTenantConfig, resolveAssignedRole, isAdminRole, normalizeEmail } from "@poolops/shared";
import { requireEnv, adminClient, parseArgs } from "./_shared";

const ADMIN_ROLES = ["org_admin", "super_admin"];

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const fix = flags.fix === "true";
  const tenant = flags.tenant?.trim().toLowerCase();

  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  const supabase = adminClient();

  let orgs = ((await supabase.from("organizations").select("id, name, slug")).data ?? []) as { id: string; name: string; slug: string | null }[];
  if (tenant) {
    const name = getTenantConfig(tenant).displayName.toLowerCase();
    orgs = orgs.filter((o) => (o.slug ?? "").toLowerCase() === tenant || (o.name ?? "").toLowerCase() === name);
  }

  console.log(`\nReviewing invite roles across ${orgs.length} organization(s)${fix ? " (FIX MODE)" : " (report only)"}…\n`);
  let flaggedTotal = 0, fixedTotal = 0;

  for (const org of orgs) {
    const config = getTenantConfig((org.slug ?? "") || "default");
    const { data: admins } = await supabase
      .from("organization_members").select("id, profile_id, role_slug, status, profiles(email)")
      .eq("organization_id", org.id).eq("status", "active").in("role_slug", ADMIN_ROLES);
    const adminRows = (admins ?? []) as any[];

    const { data: invites } = await supabase
      .from("staff_invitations").select("email, role_id, status").eq("organization_id", org.id);
    const inviteByEmail = new Map<string, string | null>();
    for (const inv of (invites ?? []) as any[]) {
      if (["accepted", "sent", "pending"].includes(inv.status)) inviteByEmail.set(normalizeEmail(inv.email), inv.role_id ?? null);
    }

    const flagged: { id: string; profileId: string; email: string; invitedRole: string | null }[] = [];
    for (const m of adminRows) {
      const email = normalizeEmail(m.profiles?.email);
      if (!email || !inviteByEmail.has(email)) continue;          // no invitation → provisioned admin, leave alone
      const invitedRole = inviteByEmail.get(email) ?? null;
      if (invitedRole && isAdminRole(invitedRole as any)) continue; // invited AS admin → legitimate
      flagged.push({ id: m.id, profileId: m.profile_id, email, invitedRole });
    }

    console.log(`• ${org.name}${org.slug ? ` (${org.slug})` : ""}: ${adminRows.length} admin(s), ${flagged.length} flagged as likely-wrong`);
    for (const f of flagged) {
      const correct = resolveAssignedRole(config, f.invitedRole);
      console.log(`    ⚠ ${f.email} is ADMIN but was invited as "${f.invitedRole ?? "(none)"}" → should be "${correct}"`);
      flaggedTotal++;
      if (fix) {
        // Never leave the tenant without an admin.
        const remaining = adminRows.length - flagged.length;
        if (remaining < 1) { console.log(`      ↳ SKIP — would remove the last admin of ${org.name}. Assign another admin first.`); continue; }
        const { error } = await supabase.from("organization_members").update({ role_slug: correct }).eq("id", f.id);
        if (error) { console.log(`      ↳ ✖ demote failed: ${error.message}`); continue; }
        await supabase.from("staff_profiles").update({ primary_role: correct, roles: [correct] }).eq("organization_id", org.id).eq("profile_id", f.profileId);
        console.log(`      ↳ ✓ demoted to ${correct}`);
        fixedTotal++;
      }
    }
  }

  console.log(`\n${flaggedTotal} account(s) flagged.${fix ? ` ${fixedTotal} demoted.` : " Re-run with --fix to demote ONLY these (your provisioned admin is never touched)."}`);
  if (!fix && flaggedTotal) console.log("Review the list above before running --fix. No changes were made.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
