import { describe, it, expect } from "vitest";
import { tenantSeed } from "./tenant-seed";
import { useDemo } from "./store";

/**
 * Bug 2 — demo/sample data must never leak into a real tenant. A real tenant's
 * reference data (facilities, staff, …) is empty, and the operational store starts
 * empty (the demo dataset only loads for the gated demo tenant, via seedDemo()).
 */
describe("Bug 2 — real tenant shows no demo data", () => {
  it("tenantSeed(demo=false) is completely empty", () => {
    const s = tenantSeed(false);
    expect(s.demo).toBe(false);
    for (const key of ["facilities", "staff", "staffCertifications", "lessonClasses", "documents", "pools", "members", "households"] as const) {
      expect(s[key], key).toEqual([]);
    }
  });

  it("tenantSeed(demo=true) has the sample dataset (demo tenant only)", () => {
    const s = tenantSeed(true);
    expect(s.demo).toBe(true);
    expect(s.staff.length).toBeGreaterThan(0);
    expect(s.facilities.length).toBeGreaterThan(0);
  });

  it("no demo names/facilities are reachable for a real tenant", () => {
    const s = tenantSeed(false);
    const blob = JSON.stringify(s);
    for (const leak of ["Marcus Reyes", "Maplewood", "Riverbend", "Northside", "Tide & Town"]) {
      expect(blob).not.toContain(leak);
    }
  });

  it("the operational store starts EMPTY (real tenants), seedDemo() fills it", () => {
    const s = useDemo.getState();
    expect(s.seeded).toBe(false);
    for (const key of ["chemicals", "shifts", "messages", "clock", "issues", "timeOff", "trades", "channels", "patron", "reports"] as const) {
      expect(s[key], key).toEqual([]);
    }
    // Seeding (demo tenant) populates it.
    s.seedDemo();
    const after = useDemo.getState();
    expect(after.seeded).toBe(true);
    expect(after.chemicals.length).toBeGreaterThan(0);
    expect(after.shifts.length).toBeGreaterThan(0);
  });
});
