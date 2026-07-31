import { describe, it, expect } from "vitest";
import {
  parsePoolHours, parseClock, checklistDayState, formatRemaining,
  chemComplianceMet, canCreateChecklist, canViewCompliance,
} from "./checklist-day";

/** Fix 6 — daily checklist window (pool operating hours), timer/overdue, compliance. */

describe("operating-hours parsing", () => {
  it("parses '9:00 AM – 8:00 PM' (Villas)", () => {
    expect(parsePoolHours("9:00 AM – 8:00 PM")).toEqual({ openMin: 9 * 60, closeMin: 20 * 60 });
  });
  it("handles 24h and 'to' forms", () => {
    expect(parsePoolHours("06:00 to 22:00")).toEqual({ openMin: 6 * 60, closeMin: 22 * 60 });
    expect(parseClock("12:00 AM")).toBe(0);
    expect(parseClock("12:00 PM")).toBe(12 * 60);
  });
  it("returns null on garbage", () => {
    expect(parsePoolHours("whenever")).toBeNull();
  });
});

describe("checklist day state (opens at pool-open, due at close, overdue after)", () => {
  const window = { openMin: 9 * 60, closeMin: 20 * 60 }; // 9:00–20:00

  it("upcoming before open", () => {
    expect(checklistDayState({ window, nowMin: 8 * 60, completed: false }).state).toBe("upcoming");
  });
  it("open during hours, counts down to close", () => {
    const r = checklistDayState({ window, nowMin: 18 * 60, completed: false });
    expect(r.state).toBe("open");
    expect(r.remainingMin).toBe(2 * 60); // 2h to close
  });
  it("overdue after close (still completable)", () => {
    expect(checklistDayState({ window, nowMin: 21 * 60, completed: false }).state).toBe("overdue");
  });
  it("complete vs complete_late by completion time", () => {
    expect(checklistDayState({ window, nowMin: 21 * 60, completed: true, completedAtMin: 15 * 60 }).state).toBe("complete");
    expect(checklistDayState({ window, nowMin: 22 * 60, completed: true, completedAtMin: 21 * 60 }).state).toBe("complete_late");
  });
  it("formats remaining", () => {
    expect(formatRemaining(140)).toBe("2h 20m");
    expect(formatRemaining(12)).toBe("12m");
    expect(formatRemaining(-5)).toBe("0m");
  });
});

describe("chem-check compliance (per-tenant target)", () => {
  it("Villas 3/day: met at 3, shortfall below", () => {
    expect(chemComplianceMet(3, 3)).toMatchObject({ met: true, shortfall: 0 });
    expect(chemComplianceMet(1, 3)).toMatchObject({ met: false, shortfall: 2 });
    expect(chemComplianceMet(5, 3)).toMatchObject({ met: true, shortfall: 0 });
  });
});

describe("checklist permissions", () => {
  it("managers/admins create + view compliance; lifeguards cannot", () => {
    expect(canCreateChecklist("org_admin")).toBe(true);
    expect(canCreateChecklist("ops_manager")).toBe(true);
    expect(canCreateChecklist("lifeguard")).toBe(false);
    expect(canCreateChecklist("head_lifeguard")).toBe(false);
    expect(canViewCompliance("lifeguard")).toBe(false);
    expect(canViewCompliance("super_admin")).toBe(true);
  });
});
