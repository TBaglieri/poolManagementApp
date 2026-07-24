import { describe, it, expect, beforeEach } from "vitest";
import { DEFAULT_CHEMICAL_RANGES } from "@poolops/shared";
import { useDemo } from "./store";

/**
 * Integration points that a Villas user hits daily — verified at the store (data)
 * layer so they can't silently regress. Covers the bug this task fixed
 * (facility → chem logs) plus staff → shifts → time clock and checklist → completion.
 */
function reset() {
  useDemo.setState({
    facilities: [], pools: [], chemicals: [], checklists: [], clock: [], shifts: [], seeded: false,
  } as never);
}

describe("facility → chemical logs (the reported bug)", () => {
  beforeEach(reset);

  it("a created facility round-trips into the store with a default pool", () => {
    const id = useDemo.getState().addFacility({
      orgId: "", name: "Ridge Pool", address: "Dobbs Ferry", poolType: "leisure",
      operatingHours: "9–8", capacity: 120, emergencyPhone: "", status: "open",
      chemicalRanges: DEFAULT_CHEMICAL_RANGES, inspectionRequired: true, imageHint: "",
    });
    const s = useDemo.getState();
    expect(s.facilities.map((f) => f.id)).toContain(id);
    expect(s.facilities.find((f) => f.id === id)?.name).toBe("Ridge Pool");
    // A default pool is created so chem logging works immediately.
    expect(s.pools.some((p) => p.facilityId === id)).toBe(true);
  });

  it("a reading logged for a created facility is stored AND out-of-range is detected", () => {
    const id = useDemo.getState().addFacility({
      orgId: "", name: "Ridge Pool", address: "", poolType: "leisure", operatingHours: "",
      capacity: 100, emergencyPhone: "", status: "open",
      chemicalRanges: DEFAULT_CHEMICAL_RANGES, inspectionRequired: true, imageHint: "",
    });
    const poolId = useDemo.getState().pools.find((p) => p.facilityId === id)!.id;
    const flags = useDemo.getState().addChemicalLog({
      facilityId: id, poolId, recordedBy: "s1",
      freeChlorine: 12, combinedChlorine: 0.2, ph: 7.5, alkalinity: 100,
      calciumHardness: 280, cyanuricAcid: 40, waterTemp: 82,
    });
    // 12 ppm free chlorine is well above the 1–4 range → flagged (proves ranges
    // resolve from the created facility, not the static seed which lacks it).
    expect(flags).toContain("freeChlorine");
    const latest = useDemo.getState().chemicals[0];
    expect(latest.facilityId).toBe(id);
    expect(latest.outOfRange).toContain("freeChlorine");
  });
});

describe("staff → shift → time clock", () => {
  beforeEach(reset);

  it("assigning a shift and clocking in both persist against the staff member", () => {
    useDemo.setState({
      shifts: [{ id: "sh1", facilityId: "f1", position: "lifeguard", date: "2026-07-24", start: "09:00", end: "17:00", assignedStaffId: null, status: "open" }],
    } as never);
    useDemo.getState().assignShift("sh1", "staff1");
    expect(useDemo.getState().shifts.find((s) => s.id === "sh1")?.assignedStaffId).toBe("staff1");

    useDemo.getState().toggleClock("staff1", "f1");
    const entry = useDemo.getState().clock.find((c) => c.staffId === "staff1");
    expect(entry).toBeTruthy();
    expect(entry?.facilityId).toBe("f1");
  });
});

describe("checklist → completion (shows on history/dashboard)", () => {
  beforeEach(reset);

  it("completing a checklist records it in the store", () => {
    useDemo.getState().completeChecklist({
      templateId: "t1", facilityId: "f1", completedBy: "staff1", kind: "opening",
      items: [{ id: "i1", label: "Unlock gate", checked: true }],
    } as never);
    expect(useDemo.getState().checklists.length).toBe(1);
    expect(useDemo.getState().checklists[0].facilityId).toBe("f1");
  });
});
