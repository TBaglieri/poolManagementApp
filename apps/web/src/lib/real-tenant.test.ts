import { describe, it, expect } from "vitest";
import { getTenantConfig } from "@poolops/shared";
import { useDemo } from "./store";

/**
 * Real-tenant correctness: a fresh tenant starts EMPTY (no demo checklists, reports,
 * etc.); the demo dataset only loads via seedDemo(). And tenant-specific operational
 * settings (like the readings-per-day cadence) live in tenant config, not shared code.
 */
describe("real tenant starts empty (no demo leak)", () => {
  it("checklist templates + reports + patron counts start empty", () => {
    const s = useDemo.getState();
    expect(s.checklistTemplates).toEqual([]);
    expect(s.reports).toEqual([]);
    expect(s.patron).toEqual([]);
  });

  it("seedDemo() loads the example checklists (demo tenant only)", () => {
    useDemo.getState().seedDemo();
    expect(useDemo.getState().checklistTemplates.length).toBeGreaterThan(0);
  });

  it("admin CRUD: a tenant can create and remove its own checklist", () => {
    // Reset to an empty template list to isolate from the seed above.
    useDemo.setState({ checklistTemplates: [] });
    const id = useDemo.getState().addChecklistTemplate({ name: "Opening", kind: "opening", cadence: "daily", facilityIds: [], items: [{ id: "i1", label: "Unlock gate" }] });
    expect(useDemo.getState().checklistTemplates.map((t) => t.name)).toContain("Opening");
    useDemo.getState().removeChecklistTemplate(id);
    expect(useDemo.getState().checklistTemplates).toEqual([]);
  });
});

describe("reading cadence is a per-tenant setting, not a hardcoded default", () => {
  it("Villas config sets three readings/day", () => {
    expect(getTenantConfig("villas").operations.expectedReadingsPerDay).toBe(3);
  });

  it("the base default does NOT assume any cadence (unset)", () => {
    expect(getTenantConfig("default").operations.expectedReadingsPerDay).toBeUndefined();
    expect(getTenantConfig("tidetown").operations.expectedReadingsPerDay).toBeUndefined();
  });
});
