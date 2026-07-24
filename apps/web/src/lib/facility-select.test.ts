import { describe, it, expect } from "vitest";
import { resolveFacilityChoice, defaultFacilityId } from "./facility-select";
import type { Facility } from "@poolops/shared";

const fac = (id: string, name = id): Facility => ({
  id, orgId: "", name, address: "", poolType: "leisure", operatingHours: "", capacity: 100,
  emergencyPhone: "", status: "open", chemicalRanges: {} as never, inspectionRequired: false, imageHint: "",
});

describe("facility-select policy (single-facility auto-select)", () => {
  it("one facility → auto-selected, picker hidden", () => {
    const c = resolveFacilityChoice([fac("f1", "Main Pool")]);
    expect(c.autoSelected).toBe(true);
    expect(c.only?.id).toBe("f1");
    expect(c.isEmpty).toBe(false);
  });

  it("two facilities → picker shown, no auto-select", () => {
    const c = resolveFacilityChoice([fac("f1"), fac("f2")]);
    expect(c.autoSelected).toBe(false);
    expect(c.only).toBeNull();
  });

  it("zero facilities → empty (show add-a-facility state)", () => {
    const c = resolveFacilityChoice([]);
    expect(c.isEmpty).toBe(true);
    expect(c.autoSelected).toBe(false);
  });

  it("defaultFacilityId picks the sole facility, else keeps a valid current, else first", () => {
    expect(defaultFacilityId([fac("f1")], "whatever")).toBe("f1"); // single wins
    expect(defaultFacilityId([fac("f1"), fac("f2")], "f2")).toBe("f2"); // keep valid current
    expect(defaultFacilityId([fac("f1"), fac("f2")], "gone")).toBe("f1"); // fallback to first
    expect(defaultFacilityId([], undefined)).toBe(""); // nothing
  });
});
