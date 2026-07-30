import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Fix 6 — audited create/save controls are NOT no-ops: each writes to Supabase (the
 * repo layer) in supabase mode. We mock the repo layer and assert the store actions
 * call the right create/update with the entity's fields, so a "Create"/"Save" button
 * persists rather than only mutating React state.
 */
const repoSpies = vi.hoisted(() => ({
  facilities: { create: vi.fn(async (_p?: any) => ({ data: { id: "fac-db-1" } })), createPool: vi.fn(async (_p?: any) => ({})), list: vi.fn() },
  reports: { create: vi.fn((_p?: any) => {}), update: vi.fn((_id?: any, _p?: any) => {}) },
  patron: { create: vi.fn((_p?: any) => {}) },
  checklists: { create: vi.fn((_p?: any) => {}) },
  chemicals: { create: vi.fn((_p?: any) => {}) },
  chat: { postMessage: vi.fn((_p?: any) => {}) },
}));

vi.mock("./repos", () => ({ activeMode: () => "supabase", repos: repoSpies }));

import { useDemo } from "./store";

beforeEach(() => {
  Object.values(repoSpies).forEach((d) => Object.values(d).forEach((f) => (f as any).mockClear?.()));
});

describe("creates persist to the database (not just local state)", () => {
  it("Add facility → inserts a facility (and its pool)", () => {
    useDemo.getState().addFacility({
      orgId: "o", name: "North Pool", address: "1 St", poolType: "lap", operatingHours: "9-5",
      capacity: 100, emergencyPhone: "911", status: "open",
      chemicalRanges: {} as any, inspectionRequired: false, imageHint: "x",
    });
    expect(repoSpies.facilities.create).toHaveBeenCalledTimes(1);
    expect(repoSpies.facilities.create.mock.calls[0][0]).toMatchObject({ name: "North Pool", address: "1 St" });
  });

  it("Log chemical reading → inserts a chemical_logs row", () => {
    useDemo.getState().addChemicalLog({
      facilityId: "f", poolId: "p", recordedBy: "s", freeChlorine: 2, combinedChlorine: 0.2, ph: 7.5,
      alkalinity: 100, calciumHardness: 280, cyanuricAcid: 40, waterTemp: 82,
    }, ["freeChlorine", "ph"]);
    expect(repoSpies.chemicals.create).toHaveBeenCalledTimes(1);
    expect(repoSpies.chemicals.create.mock.calls[0][0]).toMatchObject({ facility_id: "f", ph: 7.5 });
  });

  it("Submit shift report → inserts a shift_reports row; review → updates it", () => {
    useDemo.getState().addReport({
      facilityId: "f", staffId: "s", shiftLabel: "AM", date: "2026-07-10", weather: "sun",
      staffingNotes: "", incidents: "", maintenanceConcerns: "", patronIssues: "", suppliesNeeded: "",
      reviewStatus: "submitted",
    });
    expect(repoSpies.reports.create).toHaveBeenCalledTimes(1);
    useDemo.getState().setReportStatus("some-id", "reviewed", "looks good");
    expect(repoSpies.reports.update).toHaveBeenCalledWith("some-id", expect.objectContaining({ review_status: "reviewed" }));
  });

  it("Add patron count → inserts a patron_counts row", () => {
    useDemo.getState().addPatronCount("f", "14:00", 42, "s");
    expect(repoSpies.patron.create).toHaveBeenCalledWith(expect.objectContaining({ facility_id: "f", count: 42 }));
  });

  it("Complete checklist → inserts a checklist_completions row", () => {
    useDemo.getState().completeChecklist({ templateId: "t", facilityId: "f", completedBy: "s", status: "complete", checkedItemIds: ["a"] });
    expect(repoSpies.checklists.create).toHaveBeenCalledWith(expect.objectContaining({ template_id: "t", facility_id: "f" }));
  });
});
