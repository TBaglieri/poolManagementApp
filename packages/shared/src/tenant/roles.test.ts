import { describe, it, expect } from "vitest";
import { getTenantConfig } from "./registry";
import { lowestPrivilegeRole, resolveAssignedRole, isAdminRole } from "./roles";
import { getRole } from "../rbac/roles";

const villas = getTenantConfig("villas");
const base = getTenantConfig("default");

describe("least-privilege role resolution (invite privesc fix)", () => {
  it("lowestPrivilegeRole is the least-privileged ACTIVE role — Lifeguard for Villas", () => {
    expect(lowestPrivilegeRole(villas)).toBe("lifeguard");
    // …and it's never an admin role for any tenant.
    expect(isAdminRole(lowestPrivilegeRole(base))).toBe(false);
  });

  it("a missing/null role resolves to the lowest privilege, NEVER admin", () => {
    expect(resolveAssignedRole(villas, null)).toBe("lifeguard");
    expect(resolveAssignedRole(villas, undefined)).toBe("lifeguard");
    expect(resolveAssignedRole(villas, "")).toBe("lifeguard");
    expect(isAdminRole(resolveAssignedRole(villas, null))).toBe(false);
  });

  it("an explicitly-chosen active role is honored", () => {
    expect(resolveAssignedRole(villas, "org_admin")).toBe("org_admin");
    expect(resolveAssignedRole(villas, "lifeguard")).toBe("lifeguard");
  });

  it("super_admin is never assignable by a tenant → falls to lowest", () => {
    expect(resolveAssignedRole(villas, "super_admin")).toBe("lifeguard");
  });

  it("a role not active for the tenant falls back to lowest (no silent escalation)", () => {
    // payroll_team isn't in Villas' two-role setup.
    expect(villas.activeRoles).not.toContain("payroll_team");
    expect(resolveAssignedRole(villas, "payroll_team")).toBe("lifeguard");
  });

  it("isAdminRole flags org/super admins only", () => {
    expect(isAdminRole("org_admin")).toBe(true);
    expect(isAdminRole("super_admin")).toBe(true);
    expect(isAdminRole("lifeguard")).toBe(false);
    expect(isAdminRole("swim_instructor")).toBe(false);
  });

  it("the lowest active role really is the min-level one", () => {
    const roles = villas.activeRoles.map((s) => getRole(s as any));
    const min = roles.reduce((m, r) => (r.level < m.level ? r : m), roles[0]);
    expect(lowestPrivilegeRole(villas)).toBe(min.slug);
  });
});
