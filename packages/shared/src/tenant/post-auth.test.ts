import { describe, it, expect } from "vitest";
import { postAuthDestination, isPlatformMembership, type MembershipInput } from "./post-auth";

/**
 * §6 — the SINGLE post-auth routing decision every login entry point makes. These
 * cover the exact gap that let the root/main login land a Villas admin in the
 * platform context: routing must be driven by ACTIVE membership, not the login
 * page's own tenant context.
 */
describe("postAuthDestination", () => {
  const villasAdmin: MembershipInput = { slug: "villas", orgName: "Villas on the Ridge", role: "org_admin" };
  const villasGuard: MembershipInput = { slug: "villas", orgName: "Villas on the Ridge", role: "lifeguard" };
  const tidetown: MembershipInput = { slug: "tidetown", orgName: "Tide & Town Aquatics", role: "org_admin" };

  it("exactly one active membership → enters that tenant (no prompt)", () => {
    const dest = postAuthDestination([villasAdmin]);
    expect(dest.kind).toBe("tenant");
    if (dest.kind !== "tenant") throw new Error("expected tenant");
    expect(dest.slug).toBe("villas");
    // Admin lands on the Dashboard, inside the tenant.
    expect(dest.path).toBe("/dashboard");
    expect(dest.role).toBe("org_admin");
  });

  it("a Lifeguard lands on Schedule, never a page the role can't view", () => {
    const dest = postAuthDestination([villasGuard]);
    if (dest.kind !== "tenant") throw new Error("expected tenant");
    expect(dest.role).toBe("lifeguard");
    expect(dest.path).toBe("/schedule");
    expect(dest.path).not.toBe("/dashboard");
  });

  it("root-login and tenant-login resolve to the SAME tenant context for one membership", () => {
    // The decision is a pure function of membership — independent of which page (root
    // vs /villas) the user signed in from. Same input → same destination.
    const fromRoot = postAuthDestination([villasAdmin]);
    const fromTenant = postAuthDestination([villasAdmin]);
    expect(fromRoot).toEqual(fromTenant);
    if (fromRoot.kind !== "tenant") throw new Error("expected tenant");
    expect(`/${fromRoot.slug}${fromRoot.path}`).toBe("/villas/dashboard");
  });

  it("more than one active membership → tenant picker", () => {
    const dest = postAuthDestination([villasAdmin, tidetown]);
    expect(dest.kind).toBe("picker");
    if (dest.kind !== "picker") throw new Error("expected picker");
    expect(dest.memberships.map((m) => m.slug).sort()).toEqual(["tidetown", "villas"]);
  });

  it("two rows for the SAME tenant collapse to a single-tenant enter (not a picker)", () => {
    const dest = postAuthDestination([villasAdmin, villasGuard]);
    expect(dest.kind).toBe("tenant");
  });

  it("no membership, not a platform account → no-access (NEVER platform fallback)", () => {
    const dest = postAuthDestination([]);
    expect(dest.kind).toBe("no-access");
  });

  it("a membership on an unresolvable org (null slug) is NOT a silent platform login", () => {
    const orphan: MembershipInput = { slug: null, orgName: "Ghost Org", role: "org_admin" };
    expect(postAuthDestination([orphan]).kind).toBe("no-access");
  });

  it("a platform/super_admin account → platform context", () => {
    const platform: MembershipInput = { slug: "platform", orgName: "PoolOps Pro", role: "super_admin" };
    expect(postAuthDestination([platform]).kind).toBe("platform");
    // super_admin anywhere is treated as platform-level.
    expect(isPlatformMembership({ slug: null, orgName: null, role: "super_admin" })).toBe(true);
  });

  it("a platform account that ALSO has a tenant membership enters the tenant", () => {
    const platform: MembershipInput = { slug: "platform", orgName: "PoolOps Pro", role: "super_admin" };
    const dest = postAuthDestination([platform, villasAdmin]);
    expect(dest.kind).toBe("tenant");
    if (dest.kind !== "tenant") throw new Error("expected tenant");
    expect(dest.slug).toBe("villas");
  });

  it("a foreign/unknown role never escalates — falls to the tenant's lowest privilege", () => {
    // super_admin is platform-level, so a lone super_admin membership → platform,
    // never a silent tenant admin.
    const weird: MembershipInput = { slug: "villas", orgName: "Villas on the Ridge", role: "super_admin" };
    expect(postAuthDestination([weird]).kind).toBe("platform");
    // A bogus role string resolves against Villas config to its lowest role (lifeguard),
    // never escalating to admin.
    const bogus = postAuthDestination([{ slug: "villas", orgName: "V", role: "not_a_role" as any }]);
    if (bogus.kind !== "tenant") throw new Error("expected tenant");
    expect(bogus.role).toBe("lifeguard");
  });
});
