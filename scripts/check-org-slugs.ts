/**
 * Health check for the org/slug integrity that broke login routing.
 *
 *   npm run check-org-slugs
 *
 * Reports (and exits non-zero on) any of the corruption classes that let a tenant
 * user land in the platform context:
 *   • organizations with a NULL/blank slug            (unroutable org)
 *   • duplicate slugs across organizations            (ambiguous routing)
 *   • active memberships pointing at an org that       (orphan membership — the
 *     doesn't exist or has no resolvable slug           exact Villas failure)
 *
 * Read-only: it never mutates. Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { requireEnv, adminClient } from "./_shared";

async function main() {
  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  const supabase = adminClient();
  let problems = 0;

  const { data: orgs, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name, slug");
  if (orgErr) { console.error("✖ Could not read organizations:", orgErr.message); process.exit(1); }

  const orgById = new Map<string, { id: string; name: string | null; slug: string | null }>();
  for (const o of (orgs ?? []) as any[]) orgById.set(o.id, o);

  // 1) Null / blank slugs.
  const nullSlug = (orgs ?? []).filter((o: any) => !o.slug || !String(o.slug).trim());
  if (nullSlug.length) {
    problems += nullSlug.length;
    console.error(`✖ ${nullSlug.length} organization(s) with a null/blank slug:`);
    for (const o of nullSlug as any[]) console.error(`    • ${o.name ?? "(no name)"} [${o.id}]`);
  }

  // 2) Duplicate slugs.
  const bySlug = new Map<string, string[]>();
  for (const o of (orgs ?? []) as any[]) {
    if (!o.slug) continue;
    const list = bySlug.get(o.slug) ?? [];
    list.push(`${o.name ?? "(no name)"} [${o.id}]`);
    bySlug.set(o.slug, list);
  }
  for (const [slug, rows] of bySlug) {
    if (rows.length > 1) {
      problems += rows.length;
      console.error(`✖ Duplicate slug "${slug}" on ${rows.length} orgs: ${rows.join("; ")}`);
    }
  }

  // 3) Orphan memberships: active rows whose org is missing or has no slug.
  const { data: members, error: memErr } = await supabase
    .from("organization_members")
    .select("profile_id, organization_id, status")
    .eq("status", "active");
  if (memErr) { console.error("✖ Could not read organization_members:", memErr.message); process.exit(1); }
  const orphans = (members ?? []).filter((m: any) => {
    const org = m.organization_id ? orgById.get(m.organization_id) : null;
    return !org || !org.slug || !String(org.slug).trim();
  });
  if (orphans.length) {
    problems += orphans.length;
    console.error(`✖ ${orphans.length} active membership(s) pointing at a missing/unroutable org:`);
    for (const m of orphans as any[]) console.error(`    • profile ${m.profile_id} → org ${m.organization_id ?? "(null)"}`);
  }

  if (problems === 0) {
    console.log("✓ Org/slug integrity OK — every org has a unique slug and every active membership resolves.");
    process.exit(0);
  }
  console.error(`\n${problems} problem(s) found. Fix with supabase/organizations-slug-constraint.sql (adds NOT NULL + UNIQUE) after cleaning strays.`);
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
