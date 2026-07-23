import { describe, it, expect } from "vitest";
import { isPlatformPath, REAL_TENANT_SOURCES } from "./resolution";
import { PLATFORM_CONFIG, isPlatformSlug, isKnownTenant, getTenantConfig } from "./registry";
import { inlineIconId } from "./brand-icons";

/**
 * Platform (PoolOps Pro) vs. tenant branding must not leak into each other. The
 * platform brand is a first-class config, never a tenant, and platform pages are
 * decided by the ROUTE (real tenant signal) — not a cookie/env fallback.
 */
describe("platform vs tenant separation", () => {
  it("the platform config is PoolOps Pro and is NOT a reachable tenant", () => {
    expect(PLATFORM_CONFIG.displayName).toBe("PoolOps Pro");
    expect(PLATFORM_CONFIG.productName).toBe("PoolOps Pro");
    expect(isPlatformSlug("platform")).toBe(true);
    expect(isKnownTenant("platform")).toBe(false);          // can't be reached as a tenant
    expect(inlineIconId(PLATFORM_CONFIG.branding.icon)).toBe("waves"); // waves mark, not houses
  });

  it("isPlatformPath marks landing/login/marketing — never the app routes", () => {
    for (const p of ["/", "/login", "/pricing", "/quote", "/setup", "/accept-invite/abc", "/reset-password", "/forgot-password"]) {
      expect(isPlatformPath(p), p).toBe(true);
    }
    for (const p of ["/dashboard", "/staff", "/chemicals", "/settings/users", "/m/home"]) {
      expect(isPlatformPath(p), p).toBe(false);
    }
  });

  it("only a REAL tenant signal keeps a page tenant-branded (cookie/env don't)", () => {
    // A tenant login `/villas/login` resolves via PATH — a real source — so the
    // platform branch is skipped and it stays Villas-branded. A stale cookie/env
    // default is NOT a real source, so it can't force a tenant onto a platform page.
    expect(REAL_TENANT_SOURCES).toContain("path");
    expect(REAL_TENANT_SOURCES).toContain("subdomain");
    expect(REAL_TENANT_SOURCES).not.toContain("cookie");
    expect(REAL_TENANT_SOURCES).not.toContain("env");
  });

  it("a tenant still renders its OWN brand (generic, not hardcoded to Villas)", () => {
    expect(getTenantConfig("villas").displayName).toBe("Villas on the Ridge");
    expect(getTenantConfig("tidetown").displayName).toBe("Tide & Town Aquatics");
    expect(getTenantConfig("villas").displayName).not.toBe(PLATFORM_CONFIG.displayName);
  });
});
