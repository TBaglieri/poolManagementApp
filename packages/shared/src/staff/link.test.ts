import { describe, it, expect } from "vitest";
import { planStaffLinks, normalizeEmail, type AuthUserLite, type StaffRowLite } from "./link";

describe("normalizeEmail", () => {
  it("trims and lower-cases; blank for null", () => {
    expect(normalizeEmail("  Guard@Villas.ORG ")).toBe("guard@villas.org");
    expect(normalizeEmail(null)).toBe("");
    expect(normalizeEmail(undefined)).toBe("");
  });
});

describe("planStaffLinks", () => {
  it("links a reserved row to the auth user with the matching email", () => {
    const users: AuthUserLite[] = [{ id: "u1", email: "Ada@villas.org" }];
    const staff: StaffRowLite[] = [{ id: "s1", email: "ada@villas.org", profileId: null }];
    const plan = planStaffLinks(users, staff);
    expect(plan.links).toEqual([{ staffId: "s1", profileId: "u1" }]);
    expect(plan.unmatchedUsers).toEqual([]);
    expect(plan.unmatchedStaff).toEqual([]);
  });

  it("is idempotent — an already-linked row is a no-op", () => {
    const users: AuthUserLite[] = [{ id: "u1", email: "ada@villas.org" }];
    const staff: StaffRowLite[] = [{ id: "s1", email: "ada@villas.org", profileId: "u1" }];
    const plan = planStaffLinks(users, staff);
    expect(plan.links).toEqual([]);
    expect(plan.alreadyLinked).toEqual(["s1"]);
  });

  it("flags a user with no matching staff row for manual review", () => {
    const users: AuthUserLite[] = [{ id: "u1", email: "nobody@villas.org" }];
    const staff: StaffRowLite[] = [{ id: "s1", email: "someone@villas.org", profileId: null }];
    const plan = planStaffLinks(users, staff);
    expect(plan.links).toEqual([]);
    expect(plan.unmatchedUsers.map((u) => u.id)).toEqual(["u1"]);
    expect(plan.unmatchedStaff.map((s) => s.id)).toEqual(["s1"]);
  });

  it("claims each reserved row at most once when emails collide", () => {
    const users: AuthUserLite[] = [{ id: "u1", email: "dup@villas.org" }, { id: "u2", email: "dup@villas.org" }];
    const staff: StaffRowLite[] = [{ id: "s1", email: "dup@villas.org", profileId: null }];
    const plan = planStaffLinks(users, staff);
    expect(plan.links).toEqual([{ staffId: "s1", profileId: "u1" }]);
    expect(plan.unmatchedUsers.map((u) => u.id)).toEqual(["u2"]);
  });

  it("stays tenant-isolated: a user is never linked to another tenant's row", () => {
    // Callers pass per-tenant lists. A Villas user given ONLY the other tenant's
    // rows (different emails) links to nothing — no cross-tenant leak.
    const villasUser: AuthUserLite[] = [{ id: "u1", email: "ada@villas.org" }];
    const otherTenantStaff: StaffRowLite[] = [{ id: "s9", email: "ada@otherpool.org", profileId: null }];
    const plan = planStaffLinks(villasUser, otherTenantStaff);
    expect(plan.links).toEqual([]);
    expect(plan.unmatchedUsers.map((u) => u.id)).toEqual(["u1"]);
  });
});
