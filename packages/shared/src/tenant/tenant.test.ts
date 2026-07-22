import { describe, it, expect } from "vitest";
import {
  buildScale, ensureAccessible, contrastRatio, hexToRgb, relativeLuminance,
  AA_TEXT, STOPS,
} from "./theme";
import { resolveTenantConfig, safeResolveTenantConfig, deepMerge, resolveThemeVars } from "./resolve";
import { getTenantConfig, isKnownTenant } from "./registry";
import { isModuleEnabled, isFeatureEnabled, isPathEnabled } from "./flags";
import { resolveRoleShortLabel, isRoleActive, activeRoleList } from "./roles";
import { HUDSON_THEME, THEME_PRESETS } from "./presets";
import { DEFAULT_BRAND_SCALE } from "./defaults";

describe("color math", () => {
  it("computes known WCAG extremes", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 0);
    expect(contrastRatio([255, 255, 255], [255, 255, 255])).toBeCloseTo(1, 5);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
  });

  it("builds an 11-stop scale that darkens monotonically", () => {
    const scale = buildScale("#0F7285");
    expect(Object.keys(scale)).toHaveLength(11);
    for (let i = 1; i < STOPS.length; i++) {
      expect(relativeLuminance(scale[STOPS[i]])).toBeLessThan(relativeLuminance(scale[STOPS[i - 1]]));
    }
  });
});

describe("accessible palette", () => {
  it("auto-adjusts a too-light brand so white-on-700 passes AA", () => {
    const { scale, warnings } = ensureAccessible(buildScale("#7DD3FC")); // very light sky
    expect(contrastRatio([255, 255, 255], scale[700])).toBeGreaterThanOrEqual(AA_TEXT);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("leaves an already-dark brand's 700 passing AA", () => {
    const { scale } = ensureAccessible(buildScale("#0F7285"));
    expect(contrastRatio([255, 255, 255], scale[700])).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("every shipped preset's brand-700 clears AA for white text", () => {
    for (const p of THEME_PRESETS) {
      const { scale } = ensureAccessible(buildScale(p.theme.brand!));
      expect(contrastRatio([255, 255, 255], scale[700]), p.id).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});

describe("Villas 'Hudson Slate & Water' documented pairs", () => {
  const config = getTenantConfig("villas");
  const { vars, checks } = resolveThemeVars(config);
  const triplet = (name: string) => vars[name].split(" ").map(Number) as [number, number, number];

  it("brand-700 button/text clears AA on white", () => {
    expect(contrastRatio([255, 255, 255], triplet("--brand-700"))).toBeGreaterThanOrEqual(AA_TEXT);
    for (const c of checks.filter((c) => c.pair.includes("brand-700"))) expect(c.passesAA, c.pair).toBe(true);
  });

  it("white text on the slate sidebar (navy-950) is very high contrast", () => {
    expect(contrastRatio([255, 255, 255], triplet("--navy-950"))).toBeGreaterThanOrEqual(7);
  });

  it("generates its own Hudson brand, not the inherited default cyan (regression)", () => {
    const cyan700 = hexToRgb(DEFAULT_BRAND_SCALE["700"]).join(" ");
    expect(vars["--brand-700"]).not.toBe(cyan700);
  });
});

describe("deep merge + resolution", () => {
  it("fills gaps from defaults for a name+color-only tenant", () => {
    const config = resolveTenantConfig({ slug: "tiny", displayName: "Tiny Pool", theme: { brand: "#0F7285" } as any });
    expect(config.productName).toBe("PoolOps Pro"); // from defaults
    expect(config.operations.chemicalRanges.ph).toEqual([7.2, 7.8]); // from defaults
    expect(config.features.chemicals).toBe(true); // default module map merged in
  });

  it("deepMerge replaces arrays wholesale and merges objects", () => {
    const merged = deepMerge({ a: { x: 1, y: 2 }, list: [1, 2] }, { a: { y: 9 }, list: [3] });
    expect(merged).toEqual({ a: { x: 1, y: 9 }, list: [3] });
  });

  it("rejects a malformed config loudly", () => {
    const bad = safeResolveTenantConfig({ slug: "Bad Slug!", displayName: "x" });
    expect(bad.config).toBeNull();
    expect(bad.error).toBeTruthy();
    const badHex = safeResolveTenantConfig({ slug: "ok", displayName: "x", theme: { brand: "not-a-color" } as any });
    expect(badHex.config).toBeNull();
  });

  it("keeps the platform default pixel-identical (explicit brand-500)", () => {
    const { vars } = resolveThemeVars(getTenantConfig("default"));
    expect(vars["--brand-500"]).toBe(hexToRgb(DEFAULT_BRAND_SCALE["500"]).join(" "));
  });
});

describe("feature flags", () => {
  const villas = getTenantConfig("villas");
  const def = getTenantConfig("default");

  it("respects per-tenant module overrides", () => {
    expect(isModuleEnabled(villas, "lessons")).toBe(false);
    expect(isModuleEnabled(def, "lessons")).toBe(true);
    expect(isModuleEnabled(villas, "chemicals")).toBe(true);
  });

  it("keeps core modules on regardless of the flag map", () => {
    const hacked = { ...villas, features: { ...villas.features, settings: false, dashboard: false } };
    expect(isModuleEnabled(hacked, "settings")).toBe(true);
    expect(isModuleEnabled(hacked, "dashboard")).toBe(true);
  });

  it("gates routes by module (server + client share this)", () => {
    expect(isPathEnabled(villas, "/lessons")).toBe(false);
    expect(isPathEnabled(villas, "/chemicals/new")).toBe(true);
    expect(isPathEnabled(villas, "/login")).toBe(true); // unowned path always allowed
  });

  it("resolves sub-features, defaulting to on", () => {
    expect(isFeatureEnabled(villas, "chat", "directMessages")).toBe(true);
    const noDM = { ...villas, subFeatures: { ...villas.subFeatures, "chat.directMessages": false } };
    expect(isFeatureEnabled(noDM, "chat", "directMessages")).toBe(false);
    expect(isFeatureEnabled(noDM, "chat")).toBe(true);
  });
});

describe("role labels + registry", () => {
  it("applies tenant role-label overrides with fallback", () => {
    const villas = getTenantConfig("villas");
    expect(resolveRoleShortLabel(villas, "org_admin")).toBe("Admin / Pool Manager");
    expect(resolveRoleShortLabel(villas, "auditor")).toBe("Auditor"); // falls back to base short name
  });

  it("knows its built-in tenants and falls back for unknown", () => {
    expect(isKnownTenant("villas")).toBe(true);
    expect(isKnownTenant("nope")).toBe(false);
    expect(getTenantConfig("nope").slug).toBe("default");
    expect(getTenantConfig("villas").displayName).toBe("Villas on the Ridge");
  });

  it("Hudson theme is what Villas uses", () => {
    expect(getTenantConfig("villas").theme.brand).toBe(HUDSON_THEME.brand);
  });
});

describe("per-tenant active roles", () => {
  const villas = getTenantConfig("villas");
  const def = getTenantConfig("default");

  it("Villas runs a two-role setup (Admin/Pool Manager + Lifeguard)", () => {
    expect(villas.activeRoles).toEqual(["org_admin", "lifeguard"]);
    expect(isRoleActive(villas, "org_admin")).toBe(true);
    expect(isRoleActive(villas, "lifeguard")).toBe(true);
    expect(isRoleActive(villas, "payroll_team")).toBe(false);
    expect(isRoleActive(villas, "swim_instructor")).toBe(false);
    expect(activeRoleList(villas).map((r) => r.slug)).toEqual(["org_admin", "lifeguard"]);
  });

  it("the default tenant keeps the full hierarchy available", () => {
    expect(def.activeRoles.length).toBeGreaterThanOrEqual(10);
    expect(isRoleActive(def, "payroll_team")).toBe(true);
  });

  it("super_admin (platform owner) is always active regardless of tenant", () => {
    expect(isRoleActive(villas, "super_admin")).toBe(true);
  });
});
