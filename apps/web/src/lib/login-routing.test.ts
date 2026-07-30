import { describe, it, expect } from "vitest";
import {
  resolveTenant, isPlatformPath, REAL_TENANT_SOURCES, PLATFORM_SLUG, KNOWN_TENANT_SLUGS, DEMO_TENANT_SLUG,
  postAuthDestination, type MembershipInput,
} from "@poolops/shared";

/**
 * §6 — root/main login vs tenant login must resolve to the SAME tenant context.
 *
 * These assert the two halves that together fix the "root login lands in the
 * platform context" bug:
 *   1. The middleware brand decision: a platform PAGE stays platform-branded only
 *      when there is NO real tenant signal; a `/villas/*` path is always Villas.
 *   2. The shared post-auth decision routes by membership, so BOTH entry points end
 *      at the same tenant URL — which, loaded fresh, is the same resolved context.
 */

/** Mirror of middleware.ts: is this request a PLATFORM (non-tenant) render? */
function isPlatformRender(input: Parameters<typeof resolveTenant>[0], pathname: string): boolean {
  const res = resolveTenant(input);
  return !REAL_TENANT_SOURCES.includes(res.source) && isPlatformPath(pathname);
}

describe("middleware brand decision (server-side tenant isolation)", () => {
  it("root /login with no real signal → PLATFORM brand (never a leaked tenant)", () => {
    expect(isPlatformRender({ host: "localhost", pathname: "/login", envDefault: "villas" }, "/login")).toBe(true);
  });

  it("a stale 'last tenant' cookie does NOT tenant-brand the root login", () => {
    // cookie is not a REAL source → platform page stays platform.
    expect(isPlatformRender({ host: "localhost", pathname: "/login", cookieTenant: "villas", envDefault: "villas" }, "/login")).toBe(true);
  });

  it("the MARKETING ROOT '/' is PoolOps-Pro platform-branded, never the env-default tenant", () => {
    const vercelHost = "pool-management-app-4u5qil9b4-tb-agz-s-projects.vercel.app";
    // Fresh visit, deployment pinned to villas via envDefault → still platform on '/'.
    expect(isPlatformRender({ host: vercelHost, pathname: "/", envDefault: "villas" }, "/")).toBe(true);
    // Even with a stale villas cookie from a prior tenant login.
    expect(isPlatformRender({ host: vercelHost, pathname: "/", cookieTenant: "villas", envDefault: "villas" }, "/")).toBe(true);
  });

  it("but '/villas' (a real path signal) IS Villas-branded", () => {
    expect(isPlatformRender({ host: "localhost", pathname: "/villas", envDefault: "villas" }, "/villas")).toBe(false);
  });

  it("/villas/login (path signal) → Villas brand, not platform", () => {
    const res = resolveTenant({ host: "localhost", pathname: "/villas/login", envDefault: "villas" });
    expect(res.source).toBe("path");
    expect(res.slug).toBe("villas");
    expect(isPlatformRender({ host: "localhost", pathname: "/villas/login", envDefault: "villas" }, "/villas/login")).toBe(false);
  });

  it("/villas/dashboard always resolves to Villas (so a hard nav lands in Villas context)", () => {
    // Even with a foreign cookie, the /villas path wins → the full page load after
    // root login is byte-for-byte the same context as visiting /villas directly.
    const res = resolveTenant({ host: "localhost", pathname: "/villas/dashboard", cookieTenant: "tidetown", envDefault: "villas" });
    expect(res.slug).toBe("villas");
    expect(res.strippedPath).toBe("/dashboard");
  });
});

/**
 * Server-side DEFENSE IN DEPTH (lib/tenant/server.ts isPlatformRequest): even if the
 * middleware `x-platform` header doesn't propagate, the server re-derives platform
 * from the request path so the landing/marketing brand can never fall back to the
 * deployment's env-default tenant. Mirror of that pure decision.
 */
function pathHasTenantPrefix(path: string): boolean {
  const seg = path.replace(/^\/+/, "").split("/")[0]?.toLowerCase();
  return !!seg && KNOWN_TENANT_SLUGS.includes(seg) && seg !== DEMO_TENANT_SLUG;
}
function serverSaysPlatform(path: string): boolean {
  return isPlatformPath(path) && !pathHasTenantPrefix(path);
}

describe("server platform fallback (no x-platform header)", () => {
  it("the root '/' and platform paths are platform, never the env-default tenant", () => {
    expect(serverSaysPlatform("/")).toBe(true);
    expect(serverSaysPlatform("/login")).toBe(true);
    expect(serverSaysPlatform("/pricing")).toBe(true);
  });
  it("a real /<tenant> path stays tenant-branded", () => {
    expect(serverSaysPlatform("/villas")).toBe(false);
    expect(serverSaysPlatform("/villas/login")).toBe(false);
  });
});

describe("root login and tenant login reach the same place for one membership", () => {
  const villasAdmin: MembershipInput[] = [{ slug: "villas", orgName: "Villas on the Ridge", role: "org_admin" }];

  it("membership-driven routing yields /villas/dashboard regardless of entry point", () => {
    const dest = postAuthDestination(villasAdmin);
    if (dest.kind !== "tenant") throw new Error("expected tenant");
    const target = `/${dest.slug}${dest.path}`;
    expect(target).toBe("/villas/dashboard");
    // And that target resolves to the Villas tenant, never the platform.
    expect(resolveTenant({ host: "localhost", pathname: target, envDefault: "villas" }).slug).toBe("villas");
    expect(PLATFORM_SLUG).not.toBe("villas");
  });
});
