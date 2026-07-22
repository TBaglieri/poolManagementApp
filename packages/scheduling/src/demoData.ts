import type { ID, StaffProfile, TimeOffRequest } from "@poolops/shared";
import type { GenerateSettings, StaffingTemplate } from "./types";

const FAC = {
  maplewood: "fac_maplewood",
  riverbend: "fac_riverbend",
  northside: "fac_northside",
  lakeside: "fac_lakeside",
};

const ALL = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [0, 1, 2, 3, 4];
const WEEKEND = [5, 6];

/** Default staffing template derived from facility hours + coverage rules. */
export const demoStaffingTemplates: StaffingTemplate[] = [
  {
    id: "tmpl_summer", name: "Standard Summer Coverage", facilityId: "all",
    requirements: [
      // Maplewood
      { id: "r_mw_am", facilityId: FAC.maplewood, label: "Maplewood AM Lifeguard", position: "lifeguard", certificationRequired: "lifeguard", daysOfWeek: ALL, start: "08:00", end: "13:00", staffCount: 2 },
      { id: "r_mw_pm", facilityId: FAC.maplewood, label: "Maplewood PM Lifeguard", position: "lifeguard", certificationRequired: "lifeguard", daysOfWeek: ALL, start: "13:00", end: "18:00", staffCount: 2 },
      { id: "r_mw_head", facilityId: FAC.maplewood, label: "Maplewood Head Lifeguard", position: "head_lifeguard", daysOfWeek: ALL, start: "09:00", end: "17:00", staffCount: 1 },
      // Riverbend (indoor, long hours, high weekend demand)
      { id: "r_rb_am", facilityId: FAC.riverbend, label: "Riverbend AM Lifeguard", position: "lifeguard", certificationRequired: "lifeguard", daysOfWeek: ALL, start: "06:00", end: "12:00", staffCount: 2 },
      { id: "r_rb_pm", facilityId: FAC.riverbend, label: "Riverbend PM Lifeguard", position: "lifeguard", certificationRequired: "lifeguard", daysOfWeek: ALL, start: "12:00", end: "17:00", staffCount: 2 },
      { id: "r_rb_eve", facilityId: FAC.riverbend, label: "Riverbend Evening Lifeguard", position: "lifeguard", certificationRequired: "lifeguard", daysOfWeek: ALL, start: "16:00", end: "21:00", staffCount: 1 },
      { id: "r_rb_head", facilityId: FAC.riverbend, label: "Riverbend Head Lifeguard", position: "head_lifeguard", daysOfWeek: ALL, start: "08:00", end: "16:00", staffCount: 1 },
      { id: "r_rb_wknd", facilityId: FAC.riverbend, label: "Riverbend Weekend Surge", position: "lifeguard", certificationRequired: "lifeguard", daysOfWeek: WEEKEND, start: "12:00", end: "18:00", staffCount: 2 },
      { id: "r_rb_inst", facilityId: FAC.riverbend, label: "Riverbend Swim Instructor", position: "swim_instructor", daysOfWeek: [0, 2], start: "16:00", end: "18:00", staffCount: 1 },
      // Northside (evening slot will pull a minor with a valid cert → minor flag)
      { id: "r_ns_am", facilityId: FAC.northside, label: "Northside AM Lifeguard", position: "lifeguard", certificationRequired: "lifeguard", daysOfWeek: WEEKDAYS, start: "08:00", end: "13:00", staffCount: 1 },
      { id: "r_ns_pm", facilityId: FAC.northside, label: "Northside PM Lifeguard", position: "lifeguard", certificationRequired: "lifeguard", daysOfWeek: WEEKDAYS, start: "13:00", end: "18:00", staffCount: 1 },
      { id: "r_ns_eve", facilityId: FAC.northside, label: "Northside Evening Lifeguard", position: "lifeguard", certificationRequired: "lifeguard", daysOfWeek: [1, 3, 5], start: "16:00", end: "21:00", staffCount: 1 },
      { id: "r_ns_inst", facilityId: FAC.northside, label: "Northside Swim Instructor", position: "swim_instructor", daysOfWeek: [0, 2], start: "17:00", end: "18:00", staffCount: 1 },
      // Lakeside (only one guard with an EXPIRED cert → guaranteed coverage gap / open shift)
      { id: "r_lk_wknd", facilityId: FAC.lakeside, label: "Lakeside Weekend Lifeguard", position: "lifeguard", certificationRequired: "lifeguard", daysOfWeek: WEEKEND, start: "10:00", end: "15:00", staffCount: 1 },
      { id: "r_lk_wk", facilityId: FAC.lakeside, label: "Lakeside Lifeguard", position: "lifeguard", certificationRequired: "lifeguard", daysOfWeek: [0, 2, 4], start: "12:00", end: "17:00", staffCount: 1 },
    ],
  },
];

function atNoon(weekStart: string, dayOffset: number): string {
  const d = new Date(weekStart + "T12:00:00");
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString();
}

/**
 * Approved time-off that always lands inside the generated week, so the draft can
 * demonstrably honour it ("3 approved time-off requests were avoided").
 */
export function buildDemoTimeOff(weekStart: string): TimeOffRequest[] {
  return [
    { id: "to_demo_1", staffId: "staff_lg2", startDate: atNoon(weekStart, 1), endDate: atNoon(weekStart, 2), reason: "Family vacation", type: "vacation", status: "approved", submittedAt: atNoon(weekStart, -7), reviewedBy: "staff_sched" },
    { id: "to_demo_2", staffId: "staff_lg6", startDate: atNoon(weekStart, 4), endDate: atNoon(weekStart, 4), reason: "College orientation", type: "school", status: "approved", submittedAt: atNoon(weekStart, -6), reviewedBy: "staff_sched" },
    { id: "to_demo_3", staffId: "staff_inst1", startDate: atNoon(weekStart, 0), endDate: atNoon(weekStart, 0), reason: "Personal day", type: "personal", status: "approved", submittedAt: atNoon(weekStart, -5), reviewedBy: "staff_guardmgr" },
  ];
}

/** Seeds someone near the overtime threshold for the demo. */
export const demoPriorHours: Record<ID, number> = {
  staff_head1: 33, // Jordan — head lifeguard already at 33h
  staff_lg4: 30, // Chloe — already at 30h, weekday shifts push her over 40
};

/** Make Chloe (staff_lg4) unavailable on weekends to demonstrate availability handling. */
export function applyScenarioStaff(staff: StaffProfile[]): StaffProfile[] {
  return staff.map((s) => {
    if (s.id !== "staff_lg4") return s;
    return {
      ...s,
      availability: s.availability.map((b) =>
        b.day === "sat" || b.day === "sun" ? { ...b, preference: "unavailable" as const } : b,
      ),
    };
  });
}

export function defaultGenerateSettings(weekStart: string, facilityId: GenerateSettings["facilityId"] = "all"): GenerateSettings {
  return {
    facilityId, weekStart, templateId: "tmpl_summer",
    includeOpenShifts: true, priority: "balanced", avoidOvertime: false, maxHoursDefault: 40,
  };
}
