import { describe, it, expect } from "vitest";
import { canAddFacility, facilityLimit } from "./flags";
import { getTenantConfig } from "./registry";

/** Fix 4 — single-facility config. Villas caps at 1; other tenants are unlimited. */
describe("per-tenant facility cap", () => {
  const villas = getTenantConfig("villas");
  const platform = getTenantConfig("default");

  it("Villas is capped at one facility", () => {
    expect(facilityLimit(villas)).toBe(1);
    expect(canAddFacility(villas, 0)).toBe(true);  // no facility yet → can add the first
    expect(canAddFacility(villas, 1)).toBe(false); // at the cap → cannot add a second
  });

  it("a tenant with no cap is unlimited", () => {
    expect(facilityLimit(platform)).toBeUndefined();
    expect(canAddFacility(platform, 0)).toBe(true);
    expect(canAddFacility(platform, 25)).toBe(true);
  });
});
