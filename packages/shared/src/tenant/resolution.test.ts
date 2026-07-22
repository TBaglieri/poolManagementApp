import { describe, it, expect } from "vitest";
import { resolveTenant, firstPathSegment } from "./resolution";

const VERCEL = "poolops.vercel.app";

describe("tenant request resolution", () => {
  it("HOST match: subdomain is the primary mechanism", () => {
    const r = resolveTenant({ host: "villas.myapp.com", pathname: "/dashboard", envDefault: "villas" });
    expect(r).toMatchObject({ slug: "villas", source: "subdomain" });
  });

  it("HOST match: custom domain map wins over everything host-based", () => {
    const r = resolveTenant({ host: "pool.villasontheridge.com", pathname: "/x", customDomains: { "pool.villasontheridge.com": "villas" } });
    expect(r).toMatchObject({ slug: "villas", source: "custom-domain" });
  });

  it("PATH match: first path segment resolves the tenant on a no-domain deployment", () => {
    const r = resolveTenant({ host: VERCEL, pathname: "/villas/dashboard" });
    expect(r).toMatchObject({ slug: "villas", source: "path", strippedPath: "/dashboard" });
  });

  it("PATH match: bare /villas strips to /", () => {
    expect(resolveTenant({ host: VERCEL, pathname: "/villas" }).strippedPath).toBe("/");
  });

  it("PATH does not fire for non-tenant first segments (real routes)", () => {
    const r = resolveTenant({ host: VERCEL, pathname: "/dashboard", envDefault: "villas" });
    expect(r).toMatchObject({ slug: "villas", source: "env" }); // fell through to env pin
  });

  it("PATH never resolves the gated demo tenant", () => {
    const r = resolveTenant({ host: VERCEL, pathname: "/demo/dashboard", envDefault: "villas" });
    expect(r.source).not.toBe("path");
    expect(r.slug).toBe("villas");
  });

  it("DEV override: ?tenant= wins over host and path", () => {
    const r = resolveTenant({ host: "villas.myapp.com", pathname: "/tidetown/x", queryTenant: "tidetown" });
    expect(r).toMatchObject({ slug: "tidetown", source: "query" });
  });

  it("COOKIE persists an explicit selection across clean-URL navigation", () => {
    const r = resolveTenant({ host: VERCEL, pathname: "/dashboard", cookieTenant: "tidetown", envDefault: "villas" });
    expect(r).toMatchObject({ slug: "tidetown", source: "cookie" });
  });

  it("PATH beats a stale cookie (explicit selection)", () => {
    const r = resolveTenant({ host: VERCEL, pathname: "/villas/x", cookieTenant: "tidetown" });
    expect(r).toMatchObject({ slug: "villas", source: "path" });
  });

  it("NO MATCH: nothing resolvable → slug null (caller shows landing / unknown facility)", () => {
    const r = resolveTenant({ host: VERCEL, pathname: "/dashboard", envDefault: null });
    expect(r).toMatchObject({ slug: null, source: "none" });
  });

  it("firstPathSegment handles edges", () => {
    expect(firstPathSegment("/villas/dashboard")).toBe("villas");
    expect(firstPathSegment("/")).toBe("");
    expect(firstPathSegment("")).toBe("");
    expect(firstPathSegment(null)).toBe("");
  });
});
