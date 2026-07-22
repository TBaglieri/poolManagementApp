import { describe, it, expect } from "vitest";
import {
  can, canAll, canAny, resolvePermissions,
  ROLE_PERMISSIONS, ALL_PERMISSION_KEYS, PERMISSIONS,
} from "./permissions";
import { ROLES } from "./roles";
import type { PermissionKey, RoleSlug } from "../types";

const ROLE_SLUGS = Object.keys(ROLES) as RoleSlug[];

describe("permission catalog integrity", () => {
  it("has unique permission keys", () => {
    const keys = PERMISSIONS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every role's granted permissions are real permission keys (no typos)", () => {
    const valid = new Set<string>([...ALL_PERMISSION_KEYS, "*", "**"]);
    for (const slug of ROLE_SLUGS) {
      for (const key of ROLE_PERMISSIONS[slug]) {
        expect(valid.has(key), `${slug} references unknown permission "${key}"`).toBe(true);
      }
    }
  });
});

describe("admin wildcards", () => {
  it("super_admin can do everything including platform.manage", () => {
    for (const p of ALL_PERMISSION_KEYS) expect(can("super_admin", p)).toBe(true);
    expect(can("super_admin", "platform.manage")).toBe(true);
  });

  it("org_admin can do everything EXCEPT platform.manage", () => {
    expect(can("org_admin", "platform.manage")).toBe(false);
    for (const p of ALL_PERMISSION_KEYS.filter((k) => k !== "platform.manage")) {
      expect(can("org_admin", p), `org_admin should have ${p}`).toBe(true);
    }
  });
});

describe("least privilege — lifeguard (lowest operational role)", () => {
  // Guards log water chemistry + file incident/shift reports on deck (brief §4/§6).
  const allowed: PermissionKey[] = [
    "schedule.self", "timeclock.self", "chat.view", "checklists.complete", "maintenance.report",
    "chemicals.log", "chemicals.view", "shiftreports.submit",
  ];
  const forbidden: PermissionKey[] = [
    "staff.manage", "staff.invite", "schedule.manage", "schedule.approve",
    "payroll.view", "payroll.export", "permissions.manage", "roles.manage",
    "platform.manage", "settings.manage", "facilities.manage", "maintenance.manage",
  ];

  it.each(allowed)("CAN %s", (p) => expect(can("lifeguard", p)).toBe(true));
  it.each(forbidden)("CANNOT %s", (p) => expect(can("lifeguard", p)).toBe(false));
});

describe("privilege escalation is blocked", () => {
  it("a non-admin role can never reach platform.manage", () => {
    for (const slug of ROLE_SLUGS.filter((r) => r !== "super_admin")) {
      expect(can(slug, "platform.manage"), `${slug} must not have platform.manage`).toBe(false);
    }
  });

  it("only super_admin / org_admin can manage roles & permissions", () => {
    for (const slug of ROLE_SLUGS) {
      const shouldManage = slug === "super_admin" || slug === "org_admin";
      expect(can(slug, "roles.manage")).toBe(shouldManage);
      expect(can(slug, "permissions.manage")).toBe(shouldManage);
    }
  });

  it("a deny override cannot be bypassed and a grant override does not leak to other permissions", () => {
    // Grant a lifeguard a single elevated permission — it must NOT cascade.
    const withGrant = resolvePermissions("lifeguard", [{ permission: "schedule.approve", effect: "grant" }]);
    expect(withGrant.has("schedule.approve")).toBe(true);
    expect(withGrant.has("payroll.export")).toBe(false); // no cascade
    expect(withGrant.has("platform.manage")).toBe(false);

    // A deny override removes an otherwise-granted permission.
    expect(can("lifeguard", "checklists.complete")).toBe(true);
    const withDeny = resolvePermissions("lifeguard", [{ permission: "checklists.complete", effect: "deny" }]);
    expect(withDeny.has("checklists.complete")).toBe(false);
  });
});

describe("role-specific access boundaries", () => {
  it("payroll_team sees payroll; operations/guard roles do not", () => {
    expect(can("payroll_team", "payroll.view")).toBe(true);
    expect(can("payroll_team", "payroll.export")).toBe(true);
    expect(can("ops_manager", "payroll.view")).toBe(false);
    expect(can("lifeguard_manager", "payroll.view")).toBe(false);
    expect(can("lifeguard", "payroll.view")).toBe(false);
  });

  it("auditor is strictly read-only (view perms, no write/manage/log/submit)", () => {
    const set = resolvePermissions("auditor");
    for (const key of set) {
      expect(
        /\.(view)$/.test(key) || key === "reports.view" || key === "dashboard.view",
        `auditor should not hold write permission "${key}"`,
      ).toBe(true);
    }
    expect(can("auditor", "chemicals.log")).toBe(false);
    expect(can("auditor", "shiftreports.submit")).toBe(false);
    expect(can("auditor", "maintenance.manage")).toBe(false);
  });

  it("only schedule.approve holders can approve trades & time-off", () => {
    const approvers = ROLE_SLUGS.filter((r) => can(r, "schedule.approve"));
    // Managers/admins approve; front-line staff do not.
    expect(approvers).toContain("ops_manager");
    expect(approvers).toContain("scheduling_manager");
    expect(approvers).not.toContain("lifeguard");
    expect(approvers).not.toContain("swim_instructor");
    expect(approvers).not.toContain("maintenance");
  });
});

describe("canAny / canAll helpers", () => {
  it("canAny is true if the role has at least one permission", () => {
    expect(canAny("lifeguard", ["payroll.view", "timeclock.self"])).toBe(true);
    expect(canAny("lifeguard", ["payroll.view", "roles.manage"])).toBe(false);
  });
  it("canAll requires every permission", () => {
    expect(canAll("ops_manager", ["chemicals.log", "chemicals.view"])).toBe(true);
    expect(canAll("lifeguard", ["timeclock.self", "schedule.approve"])).toBe(false);
  });
});
