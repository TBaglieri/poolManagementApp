/**
 * Provision (or re-provision) an Admin / Pool Manager account for a tenant.
 *
 *   npm run create-admin -- --email you@example.com --tenant villas
 *   npm run create-admin -- --email you@example.com --tenant villas --first Tristen
 *
 * - Creates a Supabase auth user (the DB trigger creates the profile), links it to
 *   the tenant org as `org_admin` (Admin / Pool Manager), and creates a staff row.
 * - Idempotent: if the account already exists it RE-PROVISIONS (resets a temp
 *   password, re-affirms membership) instead of erroring.
 * - Prints a temporary password to the console; the admin changes it after first
 *   sign-in (Users & Access → Reset, or their profile).
 * - Secrets come from the environment only.
 */
import { randomUUID } from "node:crypto";
import { getTenantConfig } from "@poolops/shared";
import { requireEnv, adminClient, parseArgs } from "./_shared";

function tempPassword(): string {
  // 8+ chars, includes letters + digits (matches the app password policy).
  return `Villas-${randomUUID().slice(0, 6)}-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function findUserByEmail(supabase: ReturnType<typeof adminClient>, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const hit = data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const email = (flags.email || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const tenant = (flags.tenant || process.env.ADMIN_TENANT || "villas").trim().toLowerCase();
  const firstName = flags.first || "Admin";
  const lastName = flags.last || "";

  if (!email) {
    console.error("\n✖ Usage: npm run create-admin -- --email <email> --tenant <slug>\n");
    process.exit(1);
  }

  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  const supabase = adminClient();
  const tenantName = getTenantConfig(tenant).displayName;

  // 1) Resolve the tenant org — by slug, falling back to name if the slug column
  //    isn't present (i.e. tenant-config.sql hasn't been applied yet).
  let org: { id: string; name: string } | null = null;
  const bySlug = await supabase.from("organizations").select("id, name").eq("slug", tenant).maybeSingle();
  if (!bySlug.error && bySlug.data) org = bySlug.data as any;
  if (!org) {
    const byName = await supabase.from("organizations").select("id, name").eq("name", tenantName).maybeSingle();
    if (!byName.error && byName.data) org = byName.data as any;
  }
  if (!org) { console.error(`✖ No "${tenantName}" organization found. Run: npm run seed:villas`); process.exit(1); }
  const orgId = org.id;

  console.log(`→ Provisioning Admin / Pool Manager for ${email} on "${(org as any).name}"…`);

  // 2) Create or re-provision the auth user with a temp password.
  const password = tempPassword();
  let userId: string;
  let reprovisioned = false;
  const existing = await findUserByEmail(supabase, email);
  if (existing) {
    reprovisioned = true;
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password, email_confirm: true, user_metadata: { first_name: firstName, last_name: lastName, role: "org_admin" },
    });
    if (error) { console.error("✖ Failed to update existing user:", error.message); process.exit(1); }
    userId = existing.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, role: "org_admin" },
    });
    if (error || !data.user) { console.error("✖ Failed to create user:", error?.message); process.exit(1); }
    userId = data.user.id;
  }

  // 3) Ensure the profile is linked to the org (the trigger created the row).
  const { error: profErr } = await supabase.from("profiles")
    .update({ organization_id: orgId, first_name: firstName, last_name: lastName, email })
    .eq("id", userId);
  if (profErr) console.warn("  ! profile update warning:", profErr.message);

  // 4) Org membership as org_admin (Admin / Pool Manager). Idempotent.
  const { error: memErr } = await supabase.from("organization_members")
    .upsert({ organization_id: orgId, profile_id: userId, role_slug: "org_admin", status: "active" },
            { onConflict: "organization_id,profile_id" });
  if (memErr) {
    console.error("✖ Failed to set org membership:", memErr.message);
    if (/roles/.test(memErr.message)) console.error("  The `roles` table may be empty — run supabase/seed.sql.");
    process.exit(1);
  }

  // 5) A staff record so the admin shows in the roster (best-effort, idempotent).
  const { data: existingStaff } = await supabase.from("staff_profiles")
    .select("id").eq("organization_id", orgId).eq("profile_id", userId).maybeSingle();
  if (!existingStaff) {
    await supabase.from("staff_profiles").insert({
      organization_id: orgId, profile_id: userId, first_name: firstName, last_name: lastName,
      primary_role: "org_admin", roles: ["org_admin"], title: "Admin / Pool Manager", employment_status: "active",
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  console.log(`\n✓ ${reprovisioned ? "Re-provisioned" : "Created"} Admin / Pool Manager for ${email}`);
  console.log("  ─────────────────────────────────────────────");
  console.log(`  Sign in at : ${appUrl}/${tenant}/login`);
  console.log(`  Email      : ${email}`);
  console.log(`  Temp pass  : ${password}`);
  console.log("  ─────────────────────────────────────────────");
  console.log("  Change this password after your first sign-in. Re-run any time to reset it.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
