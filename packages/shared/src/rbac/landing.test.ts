import { describe, it, expect } from "vitest";
import { landingPathForRole, ALL_NAV_ITEMS } from "./nav";
import { canAny } from "./permissions";
import type { RoleSlug } from "../types";

/**
 * §5 — the role landing page is permission-driven: every role lands on the first
 * page it can actually access, never "Access restricted".
 */
describe("landingPathForRole", () => {
  it("an admin lands on the Dashboard", () => {
    expect(landingPathForRole("org_admin")).toBe("/dashboard");
  });

  it("a lifeguard (no dashboard.view) lands on Schedule, not the Dashboard", () => {
    const landing = landingPathForRole("lifeguard");
    expect(landing).not.toBe("/dashboard");
    expect(landing).toBe("/schedule");
  });

  it("every role lands on a page it can actually access (never restricted)", () => {
    const roles: RoleSlug[] = ["org_admin", "lifeguard", "swim_instructor", "payroll_team", "maintenance"];
    for (const role of roles) {
      const landing = landingPathForRole(role);
      const item = ALL_NAV_ITEMS.find((i) => i.href === landing);
      // The landing is a real nav destination the role passes the permission gate for
      // (or the always-accessible My Account fallback).
      if (item && item.anyOf.length > 0) {
        expect(canAny(role, item.anyOf), `${role} → ${landing}`).toBe(true);
      } else {
        expect(landing === "/settings/security" || !!item).toBe(true);
      }
    }
  });

  it("no role → login", () => {
    expect(landingPathForRole(null)).toBe("/login");
  });
});
