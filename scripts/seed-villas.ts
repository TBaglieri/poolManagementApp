/**
 * Seed / update the "Villas on the Ridge" tenant in the database.
 *
 * Idempotent: upserts the organizations row for slug `villas`, so running it
 * repeatedly updates in place and never duplicates. The tenant CONFIG (theme,
 * active roles, feature modules, operational defaults) is the single source of
 * truth in packages/shared and the app reads it from there; this writes it to the
 * DB as well (the `config` column) when that column exists.
 *
 *   npm run seed:villas
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (from .env.local).
 * The `slug`/`config` columns (supabase/tenant-config.sql) are OPTIONAL — without
 * them this still creates the org row from base columns (and warns).
 */
import { getTenantConfig } from "@poolops/shared";
import { requireEnv, adminClient } from "./_shared";

const missingColumn = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "PGRST204" || e.code === "42703" ||
    /(slug|config).*(column|schema cache)|column .*(slug|config)|no unique|on conflict/i.test(e.message || ""));

async function main() {
  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  const supabase = adminClient();
  const config = getTenantConfig("villas"); // fully resolved + validated

  // Fail loudly if no slug: a slug-less org is exactly the corruption that broke
  // login routing (a second Villas org with slug = NULL). Never create one.
  if (!config.slug || !config.slug.trim()) {
    console.error("✖ Refusing to seed: tenant config has no slug. An organization must have a routable slug.");
    process.exit(1);
  }

  console.log(`→ Seeding tenant "${config.slug}" (${config.displayName})…`);

  const base = {
    name: config.displayName,
    type: config.organizationType,
    timezone: config.timezone,
    accent_color: config.theme.brand,
    plan: "small",
    billing_status: "trial",
  };

  // Preferred path: upsert on the unique slug, storing the full config.
  let orgId: string | null = null;
  const full = { ...base, slug: config.slug, config: config as unknown as Record<string, unknown> };
  const up = await supabase.from("organizations").upsert(full, { onConflict: "slug" }).select("id").single();

  if (!up.error) {
    orgId = (up.data as any).id;
    console.log("✓ Stored full tenant config (slug + config columns).");
  } else if (missingColumn(up.error)) {
    // Fallback: base identity only, found/created by name (no slug/config columns yet).
    console.warn("  ! `slug`/`config` columns not found — storing base identity only.");
    console.warn("    Run supabase/tenant-config.sql to persist the full theme/roles/modules;");
    console.warn("    until then the app reads them from the in-code registry.");
    const found = await supabase.from("organizations").select("id").eq("name", base.name).maybeSingle();
    if (found.data) {
      await supabase.from("organizations").update(base).eq("id", (found.data as any).id);
      orgId = (found.data as any).id;
    } else {
      const ins = await supabase.from("organizations").insert(base).select("id").single();
      if (ins.error) { console.error("✖ Seed failed:", ins.error.message); process.exit(1); }
      orgId = (ins.data as any).id;
    }
  } else {
    console.error("✖ Seed failed:", up.error.message);
    process.exit(1);
  }

  console.log(`✓ Villas tenant org: ${orgId}`);
  console.log(`  • theme: ${config.theme.brand} (Hudson Slate & Water), light+dark`);
  console.log(`  • active roles: ${config.activeRoles.join(", ")}`);
  const on = Object.entries(config.features).filter(([, v]) => v).map(([k]) => k);
  const off = Object.entries(config.features).filter(([, v]) => !v).map(([k]) => k);
  console.log(`  • modules ON:  ${on.join(", ")}`);
  console.log(`  • modules OFF: ${off.join(", ") || "(none)"}`);
  console.log(`  • pool hours: ${config.operations.poolHours} · season ${config.operations.seasonStart}–${config.operations.seasonEnd}`);
  console.log("\nDone. Re-run any time — it upserts, never duplicates.");
}

main().catch((e) => { console.error(e); process.exit(1); });
