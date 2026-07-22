/**
 * PoolOps Pro — demo seed data for "Tide & Town Aquatics".
 *
 * All records are fictional. Timestamps are computed relative to the current
 * date at import time so the demo always looks "live" (today's shifts, recent
 * clock-ins, certs expiring soon). Swap this module for a real data source
 * without changing feature code — every screen reads from `seed`.
 */
import type {
  AuditLog, AvailabilityBlock, Certification, Channel, ChecklistCompletion,
  ChecklistTemplate, ChemicalLog, Document, EmergencyContact, Facility, Household,
  InspectionResult, InspectionTemplate, LessonClass, LessonRegistration,
  MaintenanceIssue, Member, Message, Notification, OnboardingSubmission,
  OnboardingTask, Organization, PatronCount, PayPeriod, PayrollExport, PayrollReview,
  Pool, RoleSlug, ShiftReport, Shift, StaffCertification, StaffProfile, TimeClockEntry,
  TimeOffRequest, ShiftTradeRequest, CertificationType, ChemicalRange, EmploymentStatus,
  StaffStatusFlag,
} from "../types";
import { dateKey, isoOffset } from "../utils";

const now = new Date();
const ORG_ID = "org_tidetown";

const FAC = {
  maplewood: "fac_maplewood",
  riverbend: "fac_riverbend",
  northside: "fac_northside",
  lakeside: "fac_lakeside",
} as const;

/* -------------------------------------------------------------------------- */
/* Organization                                                                */
/* -------------------------------------------------------------------------- */

export const organization: Organization = {
  id: ORG_ID,
  name: "Tide & Town Aquatics",
  type: "community_pool",
  timezone: "America/Chicago",
  seasonStart: isoOffset(-40, now),
  seasonEnd: isoOffset(75, now),
  accentColor: "#0E7490",
  plan: "team",
  createdAt: isoOffset(-420, now),
};

/* -------------------------------------------------------------------------- */
/* Facilities & pools                                                          */
/* -------------------------------------------------------------------------- */

const STD_RANGE: ChemicalRange = {
  freeChlorine: [1.0, 4.0],
  combinedChlorine: [0, 0.4],
  ph: [7.2, 7.8],
  alkalinity: [80, 120],
  calciumHardness: [200, 400],
  cyanuricAcid: [30, 50],
  waterTemp: [78, 86],
};

export const facilities: Facility[] = [
  {
    id: FAC.maplewood, orgId: ORG_ID, name: "Maplewood Community Pool",
    address: "412 Maplewood Dr, Cedar Falls", poolType: "outdoor_competition",
    operatingHours: "6:00 AM – 8:00 PM", capacity: 240, emergencyPhone: "(555) 911-0412",
    managerId: "staff_guardmgr", status: "open", chemicalRanges: STD_RANGE,
    inspectionRequired: true, imageHint: "from-cyan-500 to-blue-600",
  },
  {
    id: FAC.riverbend, orgId: ORG_ID, name: "Riverbend Aquatic Center",
    address: "88 Riverbend Pkwy, Cedar Falls", poolType: "indoor",
    operatingHours: "5:30 AM – 9:00 PM", capacity: 320, emergencyPhone: "(555) 911-0088",
    managerId: "staff_ops", status: "open", chemicalRanges: STD_RANGE,
    inspectionRequired: true, imageHint: "from-teal-500 to-cyan-600",
  },
  {
    id: FAC.northside, orgId: ORG_ID, name: "Northside Swim Club",
    address: "1500 Northgate Ave, Cedar Falls", poolType: "lap",
    operatingHours: "6:00 AM – 7:00 PM", capacity: 150, emergencyPhone: "(555) 911-1500",
    managerId: "staff_head2", status: "weather_delay", chemicalRanges: STD_RANGE,
    inspectionRequired: true, imageHint: "from-blue-500 to-indigo-600",
  },
  {
    id: FAC.lakeside, orgId: ORG_ID, name: "Lakeside Wading Pool",
    address: "7 Lakeside Loop, Cedar Falls", poolType: "wading",
    operatingHours: "9:00 AM – 6:00 PM", capacity: 60, emergencyPhone: "(555) 911-0007",
    managerId: "staff_head1", status: "maintenance",
    chemicalRanges: { ...STD_RANGE, waterTemp: [82, 90] },
    inspectionRequired: false, imageHint: "from-sky-400 to-cyan-500",
  },
];

export const pools: Pool[] = [
  { id: "pool_maplewood_main", facilityId: FAC.maplewood, name: "Main Competition Pool", poolType: "outdoor_competition", volumeGallons: 410000, maxDepthFt: 12 },
  { id: "pool_maplewood_wading", facilityId: FAC.maplewood, name: "Kiddie Splash Area", poolType: "splash_pad", volumeGallons: 18000, maxDepthFt: 1.5 },
  { id: "pool_riverbend_comp", facilityId: FAC.riverbend, name: "Indoor 8-Lane", poolType: "indoor", volumeGallons: 360000, maxDepthFt: 13 },
  { id: "pool_riverbend_leisure", facilityId: FAC.riverbend, name: "Leisure Pool", poolType: "leisure", volumeGallons: 95000, maxDepthFt: 4 },
  { id: "pool_northside_lap", facilityId: FAC.northside, name: "6-Lane Lap Pool", poolType: "lap", volumeGallons: 240000, maxDepthFt: 9 },
  { id: "pool_lakeside_wading", facilityId: FAC.lakeside, name: "Wading Pool", poolType: "wading", volumeGallons: 22000, maxDepthFt: 2 },
];

/* -------------------------------------------------------------------------- */
/* Staff                                                                       */
/* -------------------------------------------------------------------------- */

const DEFAULT_AVAIL: AvailabilityBlock[] = [
  { day: "mon", start: "08:00", end: "18:00", preference: "available" },
  { day: "tue", start: "08:00", end: "18:00", preference: "preferred" },
  { day: "wed", start: "12:00", end: "20:00", preference: "available" },
  { day: "thu", start: "08:00", end: "14:00", preference: "available" },
  { day: "fri", start: "08:00", end: "18:00", preference: "preferred" },
  { day: "sat", start: "09:00", end: "17:00", preference: "available" },
  { day: "sun", start: "00:00", end: "00:00", preference: "unavailable" },
];

const EC = (name: string, relationship: string, n: number): EmergencyContact => ({
  name, relationship, phone: `(555) ${300 + n}-${(2000 + n * 13).toString().slice(0, 4)}`,
});

interface StaffInput {
  id: string; first: string; last: string; role: RoleSlug; age: number;
  home: keyof typeof FAC; title: string; avatarColor: string; hireOffset: number;
  payRate: number; employmentStatus?: EmploymentStatus; statusFlags?: StaffStatusFlag[];
  onboarding?: number; docsSubmitted?: number; docsRequired?: number;
  preferredHours?: number; facilities?: (keyof typeof FAC)[]; emergency: EmergencyContact;
}

function mkStaff(i: number, s: StaffInput): StaffProfile {
  const facilityIds = (s.facilities ?? [s.home]).map((f) => FAC[f]);
  const docsRequired = s.docsRequired ?? 6;
  return {
    id: s.id, orgId: ORG_ID, userId: `user_${s.id}`,
    firstName: s.first, lastName: s.last,
    email: `${s.first}.${s.last}`.toLowerCase() + "@tideandtown.example",
    phone: `(555) ${(200 + i).toString()}-${(1000 + i * 7).toString().slice(0, 4)}`,
    avatarColor: s.avatarColor, roles: [s.role], primaryRole: s.role,
    homeFacilityId: FAC[s.home], facilityIds,
    age: s.age, isMinor: s.age < 18, hireDate: isoOffset(s.hireOffset, now),
    employmentStatus: s.employmentStatus ?? "active",
    statusFlags: s.statusFlags ?? ["active"],
    emergencyContact: s.emergency, availability: DEFAULT_AVAIL,
    preferredHoursPerWeek: s.preferredHours ?? 24, payRate: s.payRate,
    onboardingComplete: s.onboarding ?? 100,
    documentsSubmitted: s.docsSubmitted ?? docsRequired, documentsRequired: docsRequired,
    title: s.title,
  };
}

const STAFF_INPUT: StaffInput[] = [
  { id: "staff_owner", first: "Dana", last: "Whitfield", role: "super_admin", age: 44, home: "maplewood", title: "Founder & CEO", avatarColor: "#7c3aed", hireOffset: -420, payRate: 0, facilities: ["maplewood", "riverbend", "northside", "lakeside"], emergency: EC("Sam Whitfield", "Spouse", 1) },
  { id: "staff_director", first: "Marcus", last: "Reyes", role: "org_admin", age: 38, home: "maplewood", title: "Pool Director", avatarColor: "#0f2a45", hireOffset: -380, payRate: 45, facilities: ["maplewood", "riverbend", "northside", "lakeside"], emergency: EC("Lena Reyes", "Spouse", 2) },
  { id: "staff_ops", first: "Priya", last: "Nair", role: "ops_manager", age: 33, home: "riverbend", title: "Operations Manager", avatarColor: "#0891b2", hireOffset: -300, payRate: 32, facilities: ["riverbend", "northside"], emergency: EC("Raj Nair", "Brother", 3) },
  { id: "staff_guardmgr", first: "Tom", last: "Halvorsen", role: "lifeguard_manager", age: 29, home: "maplewood", title: "Aquatics Manager", avatarColor: "#0d9488", hireOffset: -260, payRate: 30, facilities: ["maplewood", "lakeside"], emergency: EC("Erik Halvorsen", "Father", 4) },
  { id: "staff_sched", first: "Sofia", last: "Marin", role: "scheduling_manager", age: 31, home: "riverbend", title: "Scheduling Manager", avatarColor: "#4f46e5", hireOffset: -210, payRate: 28, facilities: ["maplewood", "riverbend", "northside", "lakeside"], emergency: EC("Ana Marin", "Mother", 5) },
  { id: "staff_payroll", first: "Grace", last: "Liu", role: "payroll_team", age: 36, home: "maplewood", title: "Payroll Specialist", avatarColor: "#16a34a", hireOffset: -190, payRate: 30, emergency: EC("Wei Liu", "Spouse", 6) },
  { id: "staff_hr", first: "Andre", last: "Brooks", role: "hr_coordinator", age: 34, home: "maplewood", title: "HR & Onboarding Coordinator", avatarColor: "#ea580c", hireOffset: -175, payRate: 29, emergency: EC("Tanya Brooks", "Sister", 7) },
  { id: "staff_head1", first: "Jordan", last: "Kim", role: "head_lifeguard", age: 23, home: "maplewood", title: "Head Lifeguard", avatarColor: "#0ea5e9", hireOffset: -150, payRate: 21, statusFlags: ["active", "certification_expiring"], facilities: ["maplewood", "lakeside"], emergency: EC("Grace Kim", "Mother", 8) },
  { id: "staff_head2", first: "Bella", last: "Ortiz", role: "head_lifeguard", age: 25, home: "riverbend", title: "Head Lifeguard", avatarColor: "#06b6d4", hireOffset: -140, payRate: 21, facilities: ["riverbend", "northside"], emergency: EC("Mateo Ortiz", "Father", 9) },
  { id: "staff_lg1", first: "Ethan", last: "Cole", role: "lifeguard", age: 17, home: "maplewood", title: "Lifeguard", avatarColor: "#475569", hireOffset: -22, payRate: 16, employmentStatus: "pending_onboarding", statusFlags: ["pending_onboarding", "missing_forms"], onboarding: 45, docsSubmitted: 3, docsRequired: 7, preferredHours: 18, emergency: EC("Karen Cole", "Mother", 10) },
  { id: "staff_lg2", first: "Maya", last: "Patel", role: "lifeguard", age: 19, home: "riverbend", title: "Lifeguard", avatarColor: "#db2777", hireOffset: -120, payRate: 17, preferredHours: 28, emergency: EC("Nisha Patel", "Mother", 11) },
  { id: "staff_lg3", first: "Liam", last: "Nguyen", role: "lifeguard", age: 16, home: "northside", title: "Lifeguard", avatarColor: "#2563eb", hireOffset: -12, payRate: 16, employmentStatus: "pending_onboarding", statusFlags: ["pending_onboarding", "missing_forms", "needs_review"], onboarding: 20, docsSubmitted: 1, docsRequired: 7, preferredHours: 16, emergency: EC("Hai Nguyen", "Father", 12) },
  { id: "staff_lg4", first: "Chloe", last: "Adams", role: "lifeguard", age: 20, home: "maplewood", title: "Lifeguard", avatarColor: "#c026d3", hireOffset: -200, payRate: 18, statusFlags: ["active", "certification_expiring"], preferredHours: 30, facilities: ["maplewood", "lakeside"], emergency: EC("Beth Adams", "Mother", 13) },
  { id: "staff_lg5", first: "Noah", last: "Berg", role: "lifeguard", age: 18, home: "lakeside", title: "Lifeguard", avatarColor: "#dc2626", hireOffset: -160, payRate: 17, statusFlags: ["needs_review"], preferredHours: 24, emergency: EC("Olav Berg", "Father", 14) },
  { id: "staff_lg6", first: "Aria", last: "Flores", role: "lifeguard", age: 22, home: "riverbend", title: "Lifeguard", avatarColor: "#9333ea", hireOffset: -240, payRate: 18, preferredHours: 32, emergency: EC("Rosa Flores", "Mother", 15) },
  { id: "staff_lg7", first: "Jack", last: "Monroe", role: "lifeguard", age: 17, home: "northside", title: "Lifeguard", avatarColor: "#0284c7", hireOffset: -90, payRate: 16, preferredHours: 18, emergency: EC("Diane Monroe", "Mother", 16) },
  { id: "staff_inst1", first: "Ruby", last: "Sanchez", role: "swim_instructor", age: 27, home: "riverbend", title: "Swim Instructor", avatarColor: "#0d9488", hireOffset: -220, payRate: 22, preferredHours: 20, emergency: EC("Carlos Sanchez", "Brother", 17) },
  { id: "staff_inst2", first: "Owen", last: "Pierce", role: "swim_instructor", age: 24, home: "northside", title: "Swim Instructor", avatarColor: "#0e7490", hireOffset: -130, payRate: 21, preferredHours: 18, emergency: EC("Mia Pierce", "Sister", 18) },
  { id: "staff_maint", first: "Hank", last: "Dawson", role: "maintenance", age: 41, home: "maplewood", title: "Facilities & Maintenance", avatarColor: "#a16207", hireOffset: -350, payRate: 23, facilities: ["maplewood", "riverbend", "northside", "lakeside"], emergency: EC("Paula Dawson", "Spouse", 19) },
  { id: "staff_auditor", first: "Eleanor", last: "Vance", role: "auditor", age: 52, home: "maplewood", title: "County Health Inspector", avatarColor: "#475569", hireOffset: -30, payRate: 0, employmentStatus: "seasonal", statusFlags: ["active"], facilities: ["maplewood", "riverbend", "northside", "lakeside"], emergency: EC("City Health Dept.", "Agency", 20) },
];

export const staff: StaffProfile[] = STAFF_INPUT.map((s, i) => mkStaff(i, s));

/** One representative staff member per role for "log in as" demo. */
export const DEMO_STAFF_BY_ROLE: Record<RoleSlug, string> = {
  super_admin: "staff_owner",
  org_admin: "staff_director",
  ops_manager: "staff_ops",
  lifeguard_manager: "staff_guardmgr",
  scheduling_manager: "staff_sched",
  payroll_team: "staff_payroll",
  hr_coordinator: "staff_hr",
  head_lifeguard: "staff_head1",
  lifeguard: "staff_lg1",
  swim_instructor: "staff_inst1",
  maintenance: "staff_maint",
  auditor: "staff_auditor",
};

/* -------------------------------------------------------------------------- */
/* Certifications                                                              */
/* -------------------------------------------------------------------------- */

export const certificationCatalog: Certification[] = [
  { type: "lifeguard", name: "Lifeguard Certification", issuingBody: "American Lifesaving Assoc.", validMonths: 24 },
  { type: "cpr_aed", name: "CPR / AED for Professional Rescuers", issuingBody: "Red Cross", validMonths: 24 },
  { type: "first_aid", name: "Standard First Aid", issuingBody: "Red Cross", validMonths: 24 },
  { type: "wsi", name: "Water Safety Instructor", issuingBody: "American Lifesaving Assoc.", validMonths: 36 },
  { type: "cpo_afo", name: "Certified Pool Operator", issuingBody: "Pool & Hot Tub Alliance", validMonths: 60 },
  { type: "bloodborne_pathogens", name: "Bloodborne Pathogens", issuingBody: "OSHA-aligned", validMonths: 12 },
];

interface CertOverride { issuedOffset?: number; expiresOffset?: number; status?: StaffCertification["status"]; }
const guardCerts: CertificationType[] = ["lifeguard", "cpr_aed", "first_aid"];
const instructorCerts: CertificationType[] = ["wsi", "cpr_aed", "first_aid"];
const managerCerts: CertificationType[] = ["lifeguard", "cpr_aed", "cpo_afo"];

const CERT_PLAN: Record<string, CertificationType[]> = {
  staff_guardmgr: managerCerts, staff_ops: managerCerts, staff_director: ["lifeguard", "cpr_aed", "cpo_afo"],
  staff_head1: guardCerts, staff_head2: guardCerts,
  staff_lg1: guardCerts, staff_lg2: guardCerts, staff_lg3: guardCerts, staff_lg4: guardCerts,
  staff_lg5: guardCerts, staff_lg6: guardCerts, staff_lg7: guardCerts,
  staff_inst1: instructorCerts, staff_inst2: instructorCerts,
};

// Targeted overrides to create realistic compliance risk in the demo.
const CERT_OVERRIDES: Record<string, Partial<Record<CertificationType, CertOverride>>> = {
  staff_lg5: { lifeguard: { status: "expired", expiresOffset: -20 }, cpr_aed: { status: "expired", expiresOffset: -8 } },
  staff_lg4: { lifeguard: { status: "expiring", expiresOffset: 18 } },
  staff_head1: { cpr_aed: { status: "expiring", expiresOffset: 25 } },
  staff_lg1: { first_aid: { status: "missing" }, lifeguard: { status: "valid", expiresOffset: 400 } },
  staff_lg3: { lifeguard: { status: "missing" }, cpr_aed: { status: "missing" } },
};

export const staffCertifications: StaffCertification[] = Object.entries(CERT_PLAN).flatMap(([staffId, types]) =>
  types.map((type, idx) => {
    const ov = CERT_OVERRIDES[staffId]?.[type];
    const status = ov?.status ?? "valid";
    const expiresOffset = ov?.expiresOffset ?? 300 + idx * 20;
    const issuedOffset = ov?.issuedOffset ?? -400 + idx * 10;
    return {
      id: `cert_${staffId}_${type}`,
      staffId, type,
      issuedDate: status === "missing" ? null : isoOffset(issuedOffset, now),
      expiresDate: status === "missing" ? null : isoOffset(expiresOffset, now),
      status,
      certNumber: status === "missing" ? undefined : `TT-${type.slice(0, 2).toUpperCase()}-${1000 + idx}`,
    };
  }),
);

/* -------------------------------------------------------------------------- */
/* Schedule (current week)                                                     */
/* -------------------------------------------------------------------------- */

const monday = (() => {
  const d = new Date(now);
  const offset = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d;
})();

export function weekDateKey(dayOffset: number): string {
  const d = new Date(monday);
  d.setDate(monday.getDate() + dayOffset);
  return dateKey(d);
}

const facilityGuards: Record<string, string[]> = {
  [FAC.maplewood]: ["staff_lg1", "staff_lg4", "staff_head1"],
  [FAC.riverbend]: ["staff_lg2", "staff_lg6", "staff_head2"],
  [FAC.northside]: ["staff_lg3", "staff_lg7"],
  [FAC.lakeside]: ["staff_lg5"],
};

const shiftBlocks = [
  { position: "lifeguard" as const, start: "08:00", end: "13:00" },
  { position: "lifeguard" as const, start: "13:00", end: "18:00" },
  { position: "head_lifeguard" as const, start: "09:00", end: "17:00" },
];

export const shifts: Shift[] = (() => {
  const out: Shift[] = [];
  let counter = 0;
  for (let day = 0; day < 7; day++) {
    for (const fac of Object.values(FAC)) {
      const guards = facilityGuards[fac];
      shiftBlocks.forEach((block, bi) => {
        if (fac === FAC.lakeside && block.position === "head_lifeguard") return;
        counter++;
        const open = counter % 7 === 0; // ~1 in 7 left open
        const assignee = open ? null : guards[(day + bi) % guards.length];
        out.push({
          id: `shift_${day}_${fac}_${bi}`,
          facilityId: fac, position: block.position, date: weekDateKey(day),
          start: block.start, end: block.end,
          assignedStaffId: assignee,
          status: open ? "open" : day < 1 ? "completed" : "published",
        });
      });
    }
  }
  return out;
})();

/* -------------------------------------------------------------------------- */
/* Time off & shift trades                                                     */
/* -------------------------------------------------------------------------- */

export const timeOffRequests: TimeOffRequest[] = [
  { id: "to_1", staffId: "staff_lg2", startDate: weekDateKey(3), endDate: weekDateKey(4), reason: "Family trip out of town", type: "vacation", status: "pending", submittedAt: isoOffset(-1, now) },
  { id: "to_2", staffId: "staff_lg6", startDate: weekDateKey(5), endDate: weekDateKey(5), reason: "College orientation", type: "school", status: "pending", submittedAt: isoOffset(-2, now) },
  { id: "to_3", staffId: "staff_lg4", startDate: weekDateKey(6), endDate: weekDateKey(6), reason: "Not feeling well", type: "sick", status: "pending", submittedAt: isoOffset(0, now) },
  { id: "to_4", staffId: "staff_inst1", startDate: weekDateKey(8), endDate: weekDateKey(10), reason: "Pre-planned vacation", type: "vacation", status: "approved", submittedAt: isoOffset(-6, now), reviewedBy: "staff_sched" },
  { id: "to_5", staffId: "staff_lg7", startDate: weekDateKey(2), endDate: weekDateKey(2), reason: "Doctor appointment", type: "personal", status: "approved", submittedAt: isoOffset(-4, now), reviewedBy: "staff_guardmgr" },
];

export const shiftTradeRequests: ShiftTradeRequest[] = [
  { id: "trade_1", shiftId: "shift_2_fac_maplewood_0", requestedBy: "staff_lg1", requestedTo: "staff_lg4", reason: "School exam that morning", status: "pending", submittedAt: isoOffset(-1, now) },
  { id: "trade_2", shiftId: "shift_3_fac_riverbend_1", requestedBy: "staff_lg6", requestedTo: null, reason: "Open to anyone — need the evening off", status: "pending", submittedAt: isoOffset(0, now) },
  { id: "trade_3", shiftId: "shift_4_fac_northside_0", requestedBy: "staff_lg7", requestedTo: "staff_lg3", reason: "Swap morning for afternoon", status: "pending", submittedAt: isoOffset(0, now) },
];

/* -------------------------------------------------------------------------- */
/* Time clock                                                                  */
/* -------------------------------------------------------------------------- */

function todayAt(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(now); d.setHours(h, m, 0, 0); return d.toISOString();
}

export const timeClockEntries: TimeClockEntry[] = [
  { id: "tc_1", staffId: "staff_lg4", facilityId: FAC.maplewood, clockIn: todayAt("07:58"), clockOut: null, breakMinutes: 0, status: "clocked_in", flagged: false },
  { id: "tc_2", staffId: "staff_head1", facilityId: FAC.maplewood, clockIn: todayAt("08:45"), clockOut: null, breakMinutes: 30, status: "clocked_in", flagged: false },
  { id: "tc_3", staffId: "staff_lg2", facilityId: FAC.riverbend, clockIn: todayAt("08:12"), clockOut: null, breakMinutes: 0, status: "late", flagged: true, note: "Clocked in 12 min late" },
  { id: "tc_4", staffId: "staff_lg6", facilityId: FAC.riverbend, clockIn: todayAt("06:00"), clockOut: todayAt("12:01"), breakMinutes: 30, status: "clocked_out", flagged: false },
  { id: "tc_5", staffId: "staff_lg1", facilityId: FAC.maplewood, clockIn: null, clockOut: null, breakMinutes: 0, status: "missed_in", flagged: true, note: "Scheduled 08:00 — no clock-in recorded" },
  { id: "tc_6", staffId: "staff_lg5", facilityId: FAC.lakeside, clockIn: todayAt("09:02"), clockOut: null, breakMinutes: 0, status: "missed_out", flagged: true, note: "Did not clock out from yesterday" },
  { id: "tc_7", staffId: "staff_inst1", facilityId: FAC.riverbend, clockIn: todayAt("10:00"), clockOut: todayAt("12:00"), breakMinutes: 0, status: "clocked_out", flagged: false },
  { id: "tc_8", staffId: "staff_head2", facilityId: FAC.riverbend, clockIn: todayAt("07:30"), clockOut: null, breakMinutes: 0, status: "clocked_in", flagged: false },
];

/* -------------------------------------------------------------------------- */
/* Payroll                                                                     */
/* -------------------------------------------------------------------------- */

export const payPeriods: PayPeriod[] = [
  { id: "pp_current", label: "Jun 1 – Jun 14", start: isoOffset(-12, now), end: isoOffset(2, now), status: "needs_review" },
  { id: "pp_prev", label: "May 18 – May 31", start: isoOffset(-26, now), end: isoOffset(-13, now), status: "exported" },
  { id: "pp_prev2", label: "May 4 – May 17", start: isoOffset(-40, now), end: isoOffset(-27, now), status: "exported" },
];

const PAYROLL_STAFF = ["staff_lg1", "staff_lg2", "staff_lg3", "staff_lg4", "staff_lg5", "staff_lg6", "staff_lg7", "staff_head1", "staff_head2", "staff_inst1", "staff_inst2", "staff_maint"];

export const payrollReviews: PayrollReview[] = PAYROLL_STAFF.map((staffId, i) => {
  const regular = 28 + ((i * 7) % 14);
  const overtime = i % 5 === 0 ? 3 + (i % 3) : 0;
  const missing = i === 4 || i === 0; // Noah + Ethan have missing punches
  return {
    id: `pr_${staffId}`, payPeriodId: "pp_current", staffId,
    regularHours: regular, overtimeHours: overtime,
    status: missing ? "needs_review" : overtime > 0 ? "needs_review" : i % 3 === 0 ? "approved" : "ready",
    hasMissingPunch: missing,
    note: missing ? "Missing clock-out — verify hours" : overtime > 0 ? "Overtime — confirm approval" : undefined,
  };
});

export const payrollExports: PayrollExport[] = [
  { id: "pe_1", payPeriodId: "pp_prev", createdAt: isoOffset(-12, now), createdBy: "staff_payroll", format: "csv", rowCount: 14 },
  { id: "pe_2", payPeriodId: "pp_prev2", createdAt: isoOffset(-26, now), createdBy: "staff_payroll", format: "gusto", rowCount: 13 },
];

/* -------------------------------------------------------------------------- */
/* Onboarding                                                                  */
/* -------------------------------------------------------------------------- */

export const onboardingTasks: OnboardingTask[] = [
  { key: "personal_info", title: "Personal Information", description: "Legal name, address, date of birth, and contact details.", required: true },
  { key: "emergency_contact", title: "Emergency Contact", description: "Who we should call in an emergency.", required: true },
  { key: "availability", title: "Availability", description: "Your weekly availability and preferred hours.", required: true },
  { key: "certifications", title: "Certifications", description: "Upload lifeguard, CPR/AED, and first-aid certificates.", required: true, documents: ["Lifeguard cert", "CPR/AED cert", "First Aid cert"] },
  { key: "tax_forms", title: "Tax Forms", description: "Federal and state employment forms.", required: true, documents: ["W-4", "I-9", "State tax form", "Minor work permit (if under 18)"] },
  { key: "handbook", title: "Handbook Acknowledgment", description: "Read and acknowledge the employee handbook.", required: true, documents: ["Handbook acknowledgment"] },
  { key: "direct_deposit", title: "Direct Deposit", description: "Set up direct deposit for payroll.", required: false, documents: ["Direct deposit authorization"] },
  { key: "final_review", title: "Final Review", description: "Manager reviews and activates your account.", required: true },
];

export const onboardingSubmissions: OnboardingSubmission[] = [
  // Ethan (lg1) — 45% — minor, missing tax forms
  { id: "ob_1", staffId: "staff_lg1", step: "personal_info", status: "approved", submittedAt: isoOffset(-20, now) },
  { id: "ob_2", staffId: "staff_lg1", step: "emergency_contact", status: "approved", submittedAt: isoOffset(-20, now) },
  { id: "ob_3", staffId: "staff_lg1", step: "availability", status: "submitted", submittedAt: isoOffset(-18, now) },
  { id: "ob_4", staffId: "staff_lg1", step: "certifications", status: "in_progress" },
  { id: "ob_5", staffId: "staff_lg1", step: "tax_forms", status: "not_started" },
  { id: "ob_6", staffId: "staff_lg1", step: "handbook", status: "not_started" },
  { id: "ob_7", staffId: "staff_lg1", step: "final_review", status: "not_started" },
  // Liam (lg3) — 20% — just started
  { id: "ob_8", staffId: "staff_lg3", step: "personal_info", status: "submitted", submittedAt: isoOffset(-10, now) },
  { id: "ob_9", staffId: "staff_lg3", step: "emergency_contact", status: "in_progress" },
  { id: "ob_10", staffId: "staff_lg3", step: "availability", status: "not_started" },
  { id: "ob_11", staffId: "staff_lg3", step: "certifications", status: "not_started" },
  { id: "ob_12", staffId: "staff_lg3", step: "tax_forms", status: "not_started" },
];

/* -------------------------------------------------------------------------- */
/* Documents                                                                   */
/* -------------------------------------------------------------------------- */

export const documents: Document[] = [
  { id: "doc_1", orgId: ORG_ID, name: "Employee Handbook 2026", category: "employee_handbook", uploadedBy: "staff_hr", uploadedAt: isoOffset(-60, now), sizeKb: 2480, fileType: "pdf", tags: ["required-read", "policy"], visibleToRoles: [], requiresAcknowledgment: true, sensitive: false },
  { id: "doc_2", orgId: ORG_ID, name: "Emergency Action Plan", category: "safety_procedures", uploadedBy: "staff_guardmgr", uploadedAt: isoOffset(-45, now), sizeKb: 880, fileType: "pdf", tags: ["safety", "required-read"], visibleToRoles: [], requiresAcknowledgment: true, sensitive: false },
  { id: "doc_3", orgId: ORG_ID, name: "Chlorine SDS Sheet", category: "sds_sheets", uploadedBy: "staff_ops", uploadedAt: isoOffset(-120, now), sizeKb: 320, fileType: "pdf", tags: ["chemical", "safety"], visibleToRoles: [], requiresAcknowledgment: false, sensitive: false },
  { id: "doc_4", orgId: ORG_ID, name: "Muriatic Acid SDS Sheet", category: "sds_sheets", uploadedBy: "staff_ops", uploadedAt: isoOffset(-120, now), sizeKb: 298, fileType: "pdf", tags: ["chemical", "safety"], visibleToRoles: [], requiresAcknowledgment: false, sensitive: false },
  { id: "doc_5", orgId: ORG_ID, name: "W-4 Template", category: "tax_forms", uploadedBy: "staff_hr", uploadedAt: isoOffset(-90, now), sizeKb: 140, fileType: "pdf", tags: ["tax", "onboarding"], visibleToRoles: ["org_admin", "hr_coordinator", "payroll_team", "super_admin"], requiresAcknowledgment: false, sensitive: true },
  { id: "doc_6", orgId: ORG_ID, name: "I-9 Template", category: "tax_forms", uploadedBy: "staff_hr", uploadedAt: isoOffset(-90, now), sizeKb: 160, fileType: "pdf", tags: ["tax", "onboarding"], visibleToRoles: ["org_admin", "hr_coordinator", "super_admin"], requiresAcknowledgment: false, sensitive: true },
  { id: "doc_7", orgId: ORG_ID, name: "Lifeguard In-Service Training", category: "training_materials", uploadedBy: "staff_guardmgr", uploadedAt: isoOffset(-30, now), sizeKb: 5400, fileType: "pdf", tags: ["training", "lifeguard"], visibleToRoles: [], requiresAcknowledgment: false, sensitive: false },
  { id: "doc_8", orgId: ORG_ID, name: "Learn-to-Swim Lesson Plans", category: "lesson_plans", uploadedBy: "staff_inst1", uploadedAt: isoOffset(-25, now), sizeKb: 1200, fileType: "docx", tags: ["lessons"], visibleToRoles: [], requiresAcknowledgment: false, sensitive: false },
  { id: "doc_9", orgId: ORG_ID, name: "Maplewood Operating Permit", category: "facility_permits", uploadedBy: "staff_director", uploadedAt: isoOffset(-200, now), sizeKb: 410, fileType: "pdf", tags: ["permit", "maplewood"], visibleToRoles: ["org_admin", "ops_manager", "super_admin", "auditor"], requiresAcknowledgment: false, sensitive: false },
  { id: "doc_10", orgId: ORG_ID, name: "May Health Inspection Report", category: "inspection_reports", uploadedBy: "staff_auditor", uploadedAt: isoOffset(-15, now), sizeKb: 640, fileType: "pdf", tags: ["inspection", "compliance"], visibleToRoles: [], requiresAcknowledgment: false, sensitive: false },
  { id: "doc_11", orgId: ORG_ID, name: "Payroll Register — May", category: "payroll_documents", uploadedBy: "staff_payroll", uploadedAt: isoOffset(-13, now), sizeKb: 220, fileType: "xlsx", tags: ["payroll"], visibleToRoles: ["org_admin", "payroll_team", "super_admin"], requiresAcknowledgment: false, sensitive: true },
  { id: "doc_12", orgId: ORG_ID, name: "Severe Weather Procedures", category: "safety_procedures", uploadedBy: "staff_ops", uploadedAt: isoOffset(-50, now), sizeKb: 510, fileType: "pdf", tags: ["safety", "weather"], visibleToRoles: [], requiresAcknowledgment: true, sensitive: false },
];

/* -------------------------------------------------------------------------- */
/* Channels & messages                                                         */
/* -------------------------------------------------------------------------- */

export const channels: Channel[] = [
  { id: "ch_all", name: "All Team", kind: "all_staff", description: "Everyone — org-wide announcements & coordination", unread: 2 },
  { id: "ch_guards", name: "Lifeguards", kind: "role", description: "Lifeguard team channel", restrictedToRoles: ["lifeguard", "head_lifeguard", "lifeguard_manager", "ops_manager", "org_admin", "super_admin"], unread: 0 },
  { id: "ch_mgrs", name: "Managers", kind: "role", description: "Management coordination", restrictedToRoles: ["ops_manager", "lifeguard_manager", "scheduling_manager", "org_admin", "super_admin", "hr_coordinator"], unread: 1 },
  { id: "ch_inst", name: "Swim Instructors", kind: "role", description: "Instructor coordination", restrictedToRoles: ["swim_instructor", "ops_manager", "org_admin", "super_admin"], unread: 0 },
  { id: "ch_maint", name: "Maintenance", kind: "role", description: "Facilities & maintenance", restrictedToRoles: ["maintenance", "ops_manager", "org_admin", "super_admin"], unread: 3 },
  { id: "ch_admin", name: "Payroll / Admin", kind: "admin", description: "Office & payroll", restrictedToRoles: ["payroll_team", "hr_coordinator", "org_admin", "super_admin"], unread: 0 },
  { id: "ch_maplewood", name: "Maplewood Pool", kind: "facility", description: "Maplewood Community Pool team", facilityId: FAC.maplewood, unread: 1 },
  { id: "ch_riverbend", name: "Riverbend Center", kind: "facility", description: "Riverbend Aquatic Center team", facilityId: FAC.riverbend, unread: 0 },
];

export const messages: Message[] = [
  { id: "msg_1", channelId: "ch_all", senderId: "staff_director", body: "Welcome to the 2026 season, team! Excited to have everyone back. Let's make safety our #1 priority every shift.", sentAt: isoOffset(-2, now), pinned: true },
  { id: "msg_2", channelId: "ch_all", senderId: "staff_sched", body: "📅 Next week's schedule has been published. Please review your shifts and submit any trade requests by Thursday.", sentAt: isoOffset(-1, now), pinned: false, template: "schedule_published" },
  { id: "msg_3", channelId: "ch_maplewood", senderId: "staff_guardmgr", body: "⛈️ Possible afternoon storms today at Maplewood. Watch the sky and be ready to clear the pool. I'll post updates here.", sentAt: isoOffset(0, now), pinned: true, template: "weather_delay" },
  { id: "msg_4", channelId: "ch_guards", senderId: "staff_head1", body: "Reminder: in-service training this Saturday 8am at Maplewood. Bring your rescue tube.", sentAt: isoOffset(0, now), pinned: false, template: "shift_reminder" },
  { id: "msg_5", channelId: "ch_maint", senderId: "staff_ops", body: "Lakeside pump is making noise again — Hank, can you take a look before open tomorrow?", sentAt: isoOffset(0, now), pinned: false },
  { id: "msg_6", channelId: "ch_maint", senderId: "staff_maint", body: "On it. Ordered a replacement seal, should arrive Thursday. Keeping Lakeside on maintenance status until then.", sentAt: isoOffset(0, now), pinned: false },
  { id: "msg_7", channelId: "ch_maint", senderId: "staff_maint", body: "Slide ladder at Riverbend tightened and re-inspected. Good to go.", sentAt: isoOffset(0, now), pinned: false },
  { id: "msg_8", channelId: "ch_mgrs", senderId: "staff_ops", body: "Heads up: Northside is on weather delay this morning. Will reassess at 10am.", sentAt: isoOffset(0, now), pinned: false },
  { id: "msg_9", channelId: "ch_guards", senderId: "staff_guardmgr", body: "🎓 Chloe and Noah — your lifeguard certs are coming up. Please check the Certifications page and renew ASAP.", sentAt: isoOffset(-1, now), pinned: false, template: "missing_certification" },
  { id: "msg_10", channelId: "ch_all", senderId: "staff_director", body: "Great job everyone handling the busy weekend — patron counts hit a season high at Riverbend!", sentAt: isoOffset(-3, now), pinned: false },
];

/* -------------------------------------------------------------------------- */
/* Chemical logs                                                               */
/* -------------------------------------------------------------------------- */

function outOfRange(values: Record<string, number>, range: ChemicalRange): string[] {
  const flags: string[] = [];
  (Object.keys(range) as (keyof ChemicalRange)[]).forEach((k) => {
    const [min, max] = range[k];
    const v = values[k];
    if (typeof v === "number" && (v < min || v > max)) flags.push(k);
  });
  return flags;
}

interface ChemReading { fc: number; cc: number; ph: number; ta: number; ch: number; cya: number; temp: number; }
function mkChem(id: string, facilityId: string, poolId: string, by: string, hoursAgo: number, r: ChemReading, notes?: string, action?: string): ChemicalLog {
  const facility = facilities.find((f) => f.id === facilityId)!;
  const values = { freeChlorine: r.fc, combinedChlorine: r.cc, ph: r.ph, alkalinity: r.ta, calciumHardness: r.ch, cyanuricAcid: r.cya, waterTemp: r.temp };
  const flags = outOfRange(values, facility.chemicalRanges);
  return {
    id, facilityId, poolId, recordedBy: by,
    recordedAt: new Date(now.getTime() - hoursAgo * 3600_000).toISOString(),
    ...values, notes, correctiveAction: action, outOfRange: flags,
  };
}

export const chemicalLogs: ChemicalLog[] = [
  mkChem("chem_1", FAC.maplewood, "pool_maplewood_main", "staff_head1", 2, { fc: 2.4, cc: 0.2, ph: 7.5, ta: 100, ch: 280, cya: 40, temp: 82 }, "Opening test — all in range."),
  mkChem("chem_2", FAC.maplewood, "pool_maplewood_main", "staff_lg4", 8, { fc: 1.2, cc: 0.5, ph: 7.9, ta: 95, ch: 290, cya: 42, temp: 83 }, "Combined chlorine high; pH above range.", "Added chlorine, will re-test in 2 hrs and add acid."),
  mkChem("chem_3", FAC.riverbend, "pool_riverbend_comp", "staff_head2", 3, { fc: 3.1, cc: 0.1, ph: 7.4, ta: 110, ch: 320, cya: 38, temp: 81 }, "Indoor pool — good readings."),
  mkChem("chem_4", FAC.riverbend, "pool_riverbend_leisure", "staff_lg2", 5, { fc: 0.6, cc: 0.3, ph: 7.3, ta: 105, ch: 300, cya: 36, temp: 84 }, "Free chlorine low after busy morning.", "Boosted chlorine feeder, re-testing shortly."),
  mkChem("chem_5", FAC.northside, "pool_northside_lap", "staff_head2", 6, { fc: 2.8, cc: 0.2, ph: 7.6, ta: 90, ch: 250, cya: 45, temp: 80 }),
  mkChem("chem_6", FAC.lakeside, "pool_lakeside_wading", "staff_lg5", 26, { fc: 2.0, cc: 0.1, ph: 7.4, ta: 85, ch: 240, cya: 30, temp: 86 }, "Wading pool stable."),
  mkChem("chem_7", FAC.maplewood, "pool_maplewood_main", "staff_head1", 28, { fc: 2.6, cc: 0.2, ph: 7.5, ta: 102, ch: 285, cya: 41, temp: 81 }),
  mkChem("chem_8", FAC.riverbend, "pool_riverbend_comp", "staff_head2", 30, { fc: 5.2, cc: 0.2, ph: 7.5, ta: 108, ch: 315, cya: 39, temp: 81 }, "Free chlorine spiked after shock treatment.", "Holding pool closed until FC drops below 4.0 ppm."),
  mkChem("chem_9", FAC.northside, "pool_northside_lap", "staff_head2", 52, { fc: 2.5, cc: 0.3, ph: 7.7, ta: 95, ch: 260, cya: 44, temp: 79 }),
  mkChem("chem_10", FAC.maplewood, "pool_maplewood_main", "staff_head1", 54, { fc: 2.3, cc: 0.2, ph: 7.4, ta: 100, ch: 280, cya: 40, temp: 82 }),
];

/* -------------------------------------------------------------------------- */
/* Checklists                                                                  */
/* -------------------------------------------------------------------------- */

export const checklistTemplates: ChecklistTemplate[] = [
  {
    id: "cl_opening", name: "Daily Opening Checklist", kind: "opening", cadence: "daily",
    facilityIds: Object.values(FAC),
    items: [
      { id: "cli_o1", label: "Unlock gates and turn on facility lights" },
      { id: "cli_o2", label: "Test chemical levels and log results", requiresNote: true },
      { id: "cli_o3", label: "Inspect pool deck for hazards" },
      { id: "cli_o4", label: "Confirm rescue equipment is in place" },
      { id: "cli_o5", label: "Check AED and first-aid stations" },
      { id: "cli_o6", label: "Verify lifeguard stands are positioned" },
    ],
  },
  {
    id: "cl_closing", name: "Daily Closing Checklist", kind: "closing", cadence: "daily",
    facilityIds: Object.values(FAC),
    items: [
      { id: "cli_c1", label: "Clear and secure the pool" },
      { id: "cli_c2", label: "Stow rescue equipment" },
      { id: "cli_c3", label: "Final chemical reading", requiresNote: true },
      { id: "cli_c4", label: "Clean deck and restrooms" },
      { id: "cli_c5", label: "Lock gates and arm alarm" },
    ],
  },
  {
    id: "cl_stand", name: "Lifeguard Stand Checklist", kind: "lifeguard_stand", cadence: "per_shift",
    facilityIds: [FAC.maplewood, FAC.riverbend, FAC.northside],
    items: [
      { id: "cli_s1", label: "Rescue tube present and serviceable" },
      { id: "cli_s2", label: "Backboard and head immobilizer ready" },
      { id: "cli_s3", label: "Whistle and signage in place" },
      { id: "cli_s4", label: "Clear sightlines to assigned zone" },
    ],
  },
  {
    id: "cl_bathroom", name: "Restroom Cleanliness", kind: "bathroom", cadence: "per_shift",
    facilityIds: Object.values(FAC),
    items: [
      { id: "cli_b1", label: "Restock soap and paper" },
      { id: "cli_b2", label: "Clean and sanitize surfaces" },
      { id: "cli_b3", label: "Empty trash" },
      { id: "cli_b4", label: "Mop floors" },
    ],
  },
  {
    id: "cl_firstaid", name: "First-Aid Kit Check", kind: "first_aid_kit", cadence: "weekly",
    facilityIds: Object.values(FAC),
    items: [
      { id: "cli_f1", label: "Bandages and gauze stocked" },
      { id: "cli_f2", label: "Gloves and CPR mask present" },
      { id: "cli_f3", label: "Check expiration dates", requiresNote: true },
      { id: "cli_f4", label: "AED pads in date" },
    ],
  },
];

export const checklistCompletions: ChecklistCompletion[] = [
  { id: "clc_1", templateId: "cl_opening", facilityId: FAC.maplewood, completedBy: "staff_head1", completedAt: todayAt("06:15"), status: "complete", checkedItemIds: ["cli_o1", "cli_o2", "cli_o3", "cli_o4", "cli_o5", "cli_o6"], note: "All clear at open." },
  { id: "clc_2", templateId: "cl_opening", facilityId: FAC.riverbend, completedBy: "staff_head2", completedAt: todayAt("05:40"), status: "complete", checkedItemIds: ["cli_o1", "cli_o2", "cli_o3", "cli_o4", "cli_o5", "cli_o6"] },
  { id: "clc_3", templateId: "cl_opening", facilityId: FAC.northside, completedBy: "staff_lg7", completedAt: todayAt("06:30"), status: "incomplete", checkedItemIds: ["cli_o1", "cli_o3"], note: "Weather delay — pool not opened, chemicals pending." },
  { id: "clc_4", templateId: "cl_stand", facilityId: FAC.maplewood, completedBy: "staff_lg4", completedAt: todayAt("08:05"), status: "complete", checkedItemIds: ["cli_s1", "cli_s2", "cli_s3", "cli_s4"] },
  { id: "clc_5", templateId: "cl_closing", facilityId: FAC.riverbend, completedBy: "staff_lg6", completedAt: todayAt("12:05"), status: "complete", checkedItemIds: ["cli_c1", "cli_c2", "cli_c3", "cli_c4", "cli_c5"] },
];

/* -------------------------------------------------------------------------- */
/* Shift reports                                                               */
/* -------------------------------------------------------------------------- */

export const shiftReports: ShiftReport[] = [
  { id: "sr_1", facilityId: FAC.maplewood, staffId: "staff_head1", shiftLabel: "Morning (6a–1p)", date: weekDateKey(0), weather: "Sunny, 84°F", staffingNotes: "Full coverage, all guards on time.", incidents: "One minor scrape — band-aid applied, no report needed.", maintenanceConcerns: "Skimmer basket #3 cracked.", patronIssues: "Busy lap swim, no issues.", suppliesNeeded: "More band-aids, sunscreen for guard station.", reviewStatus: "reviewed", managerNotes: "Thanks Jordan — maintenance ticket created for skimmer." },
  { id: "sr_2", facilityId: FAC.riverbend, staffId: "staff_head2", shiftLabel: "Morning (5:30a–12p)", date: weekDateKey(0), weather: "Indoor", staffingNotes: "Maya 12 min late, covered by Aria.", incidents: "None.", maintenanceConcerns: "Slide ladder slightly loose — reported to Hank.", patronIssues: "Swim team practice ran long.", suppliesNeeded: "None.", reviewStatus: "submitted" },
  { id: "sr_3", facilityId: FAC.lakeside, staffId: "staff_lg5", shiftLabel: "Afternoon (1p–6p)", date: weekDateKey(-1), weather: "Partly cloudy, 80°F", staffingNotes: "Solo guard shift.", incidents: "None.", maintenanceConcerns: "Pump noise getting louder.", patronIssues: "Low attendance.", suppliesNeeded: "Test strips running low.", reviewStatus: "flagged", managerNotes: "Following up on pump — Lakeside to maintenance status." },
];

/* -------------------------------------------------------------------------- */
/* Patron counts                                                               */
/* -------------------------------------------------------------------------- */

const PATRON_HOURS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
function patronCurve(base: number, i: number): number {
  // bell-ish curve peaking mid-afternoon
  const peak = 4;
  const factor = 1 - Math.abs(i - peak) / 7;
  return Math.max(4, Math.round(base * factor + ((i * 7) % 11)));
}

export const patronCounts: PatronCount[] = (() => {
  const out: PatronCount[] = [];
  const bases: Record<string, number> = { [FAC.maplewood]: 160, [FAC.riverbend]: 210, [FAC.northside]: 90, [FAC.lakeside]: 45 };
  // today's hourly counts
  Object.entries(bases).forEach(([fac, base]) => {
    PATRON_HOURS.forEach((slot, i) => {
      out.push({
        id: `pc_${fac}_${slot}`, facilityId: fac, recordedAt: todayAt(slot),
        recordedBy: "staff_head1", timeSlot: slot, count: patronCurve(base, i),
      });
    });
  });
  // prior-week daily peaks (Maplewood) for the trend chart
  for (let d = 1; d <= 6; d++) {
    out.push({
      id: `pc_hist_${d}`, facilityId: FAC.maplewood, recordedAt: isoOffset(-d, now),
      recordedBy: "staff_head1", timeSlot: "15:00", count: 150 + ((d * 23) % 60),
    });
  }
  return out;
})();

/* -------------------------------------------------------------------------- */
/* Maintenance                                                                 */
/* -------------------------------------------------------------------------- */

export const maintenanceIssues: MaintenanceIssue[] = [
  { id: "mi_1", facilityId: FAC.lakeside, area: "Pump Room", title: "Circulation pump making grinding noise", description: "Pump #2 is loud and vibrating. Possible bearing or seal failure.", priority: "urgent", status: "waiting_parts", reportedBy: "staff_lg5", assignedTo: "staff_maint", reportedAt: isoOffset(-2, now), dueDate: isoOffset(2, now), hasPhoto: true },
  { id: "mi_2", facilityId: FAC.maplewood, area: "Main Pool", title: "Cracked skimmer basket #3", description: "Skimmer basket cracked, not catching debris.", priority: "medium", status: "new", reportedBy: "staff_head1", assignedTo: "staff_maint", reportedAt: isoOffset(0, now), dueDate: isoOffset(3, now), hasPhoto: false },
  { id: "mi_3", facilityId: FAC.riverbend, area: "Slide", title: "Slide ladder loose", description: "Top ladder rung wobbles. Tightened temporarily, needs proper fix.", priority: "high", status: "resolved", reportedBy: "staff_head2", assignedTo: "staff_maint", reportedAt: isoOffset(-1, now), hasPhoto: true },
  { id: "mi_4", facilityId: FAC.maplewood, area: "Restroom", title: "Women's restroom faucet dripping", description: "Constant drip, wasting water.", priority: "low", status: "in_progress", reportedBy: "staff_lg4", assignedTo: "staff_maint", reportedAt: isoOffset(-3, now), dueDate: isoOffset(5, now), hasPhoto: false },
  { id: "mi_5", facilityId: FAC.northside, area: "Deck", title: "Loose deck tile near lane 1", description: "Trip hazard — tile lifting at the corner.", priority: "high", status: "new", reportedBy: "staff_lg7", assignedTo: null, reportedAt: isoOffset(0, now), dueDate: isoOffset(1, now), hasPhoto: true },
  { id: "mi_6", facilityId: FAC.riverbend, area: "Locker Room", title: "Locker door off track", description: "Locker 42 door won't close.", priority: "low", status: "new", reportedBy: "staff_lg2", assignedTo: null, reportedAt: isoOffset(-1, now), hasPhoto: false },
  { id: "mi_7", facilityId: FAC.maplewood, area: "Fence", title: "Perimeter gate latch sticking", description: "Self-closing latch slow to engage — safety concern.", priority: "high", status: "in_progress", reportedBy: "staff_guardmgr", assignedTo: "staff_maint", reportedAt: isoOffset(-1, now), dueDate: isoOffset(1, now), hasPhoto: false },
  { id: "mi_8", facilityId: FAC.lakeside, area: "Shade Structure", title: "Torn shade sail", description: "Shade sail torn at grommet, flapping in wind.", priority: "medium", status: "resolved", reportedBy: "staff_lg5", assignedTo: "staff_maint", reportedAt: isoOffset(-5, now), hasPhoto: true },
];

/* -------------------------------------------------------------------------- */
/* Inspections                                                                 */
/* -------------------------------------------------------------------------- */

export const inspectionTemplates: InspectionTemplate[] = [
  { id: "it_aed", name: "AED Inspection", feature: "aed", cadenceDays: 30, checkpoints: ["Pads in date", "Battery charged", "Indicator green", "Unit accessible"] },
  { id: "it_firstaid", name: "First-Aid Station", feature: "first_aid_stations", cadenceDays: 7, checkpoints: ["Fully stocked", "Items in date", "Clearly marked", "Accessible"] },
  { id: "it_stands", name: "Lifeguard Stand", feature: "lifeguard_stands", cadenceDays: 14, checkpoints: ["Structurally sound", "Umbrella intact", "Rescue tube present", "Clear sightlines"] },
  { id: "it_slide", name: "Water Slide", feature: "slide", cadenceDays: 7, checkpoints: ["Ladder secure", "Surface smooth", "Water flow correct", "Run-out clear"] },
  { id: "it_tubes", name: "Rescue Tubes", feature: "rescue_tubes", cadenceDays: 30, checkpoints: ["Strap intact", "No cracks", "Buoyancy good", "Quantity correct"] },
  { id: "it_ladders", name: "Pool Ladders", feature: "ladders", cadenceDays: 30, checkpoints: ["Anchors tight", "No rust/sharp edges", "Treads secure"] },
];

export const inspectionResults: InspectionResult[] = [
  { id: "ir_1", templateId: "it_aed", facilityId: FAC.maplewood, inspectedBy: "staff_guardmgr", inspectedAt: isoOffset(-3, now), result: "pass", notes: "All good.", hasPhoto: false },
  { id: "ir_2", templateId: "it_aed", facilityId: FAC.riverbend, inspectedBy: "staff_head2", inspectedAt: isoOffset(-1, now), result: "needs_attention", notes: "Pads expire next month — order replacements.", hasPhoto: true },
  { id: "ir_3", templateId: "it_slide", facilityId: FAC.riverbend, inspectedBy: "staff_maint", inspectedAt: isoOffset(-1, now), result: "fail", notes: "Ladder rung loose — taken out of service until repaired.", hasPhoto: true },
  { id: "ir_4", templateId: "it_stands", facilityId: FAC.maplewood, inspectedBy: "staff_head1", inspectedAt: isoOffset(-2, now), result: "pass", hasPhoto: false },
  { id: "ir_5", templateId: "it_firstaid", facilityId: FAC.northside, inspectedBy: "staff_head2", inspectedAt: isoOffset(-9, now), result: "needs_attention", notes: "Low on gauze.", hasPhoto: false },
  { id: "ir_6", templateId: "it_tubes", facilityId: FAC.lakeside, inspectedBy: "staff_lg5", inspectedAt: isoOffset(-5, now), result: "pass", hasPhoto: false },
];

/* -------------------------------------------------------------------------- */
/* Lessons & members                                                           */
/* -------------------------------------------------------------------------- */

export const lessonClasses: LessonClass[] = [
  { id: "lc_1", facilityId: FAC.riverbend, name: "Guppies — Beginner", level: "beginner", instructorId: "staff_inst1", dayOfWeek: "Mon & Wed", start: "16:00", end: "16:45", capacity: 8, enrolled: 6, startDate: isoOffset(-20, now), endDate: isoOffset(20, now) },
  { id: "lc_2", facilityId: FAC.riverbend, name: "Stingrays — Intermediate", level: "intermediate", instructorId: "staff_inst1", dayOfWeek: "Tue & Thu", start: "17:00", end: "17:45", capacity: 8, enrolled: 8, startDate: isoOffset(-20, now), endDate: isoOffset(20, now) },
  { id: "lc_3", facilityId: FAC.northside, name: "Sharks — Advanced", level: "advanced", instructorId: "staff_inst2", dayOfWeek: "Mon & Wed", start: "17:00", end: "18:00", capacity: 10, enrolled: 7, startDate: isoOffset(-15, now), endDate: isoOffset(25, now) },
  { id: "lc_4", facilityId: FAC.riverbend, name: "Parent & Tot", level: "parent_child", instructorId: "staff_inst1", dayOfWeek: "Sat", start: "09:00", end: "09:30", capacity: 6, enrolled: 5, startDate: isoOffset(-10, now), endDate: isoOffset(30, now) },
  { id: "lc_5", facilityId: FAC.northside, name: "Private — Maddie R.", level: "private", instructorId: "staff_inst2", dayOfWeek: "Fri", start: "16:00", end: "16:30", capacity: 1, enrolled: 1, startDate: isoOffset(-5, now), endDate: isoOffset(25, now) },
];

export const lessonRegistrations: LessonRegistration[] = [
  { id: "lr_1", classId: "lc_1", memberId: "mem_2", studentName: "Mia Carter", studentAge: 5, attendance: [{ date: isoOffset(-7, now), present: true }, { date: isoOffset(-5, now), present: true }, { date: isoOffset(-2, now), present: false }], progressNotes: [{ date: isoOffset(-5, now), note: "Comfortable putting face in water. Working on back floats.", author: "staff_inst1" }] },
  { id: "lr_2", classId: "lc_1", memberId: "mem_4", studentName: "Leo Nguyen", studentAge: 6, attendance: [{ date: isoOffset(-7, now), present: true }, { date: isoOffset(-5, now), present: true }], progressNotes: [{ date: isoOffset(-7, now), note: "Great kicking. Needs work on breathing rhythm.", author: "staff_inst1" }] },
  { id: "lr_3", classId: "lc_3", memberId: "mem_6", studentName: "Ava Brooks", studentAge: 10, attendance: [{ date: isoOffset(-6, now), present: true }, { date: isoOffset(-3, now), present: true }], progressNotes: [{ date: isoOffset(-3, now), note: "Strong freestyle. Introduced flip turns today.", author: "staff_inst2" }] },
  { id: "lr_4", classId: "lc_5", memberId: "mem_8", studentName: "Maddie Rivera", studentAge: 8, attendance: [{ date: isoOffset(-5, now), present: true }], progressNotes: [{ date: isoOffset(-5, now), note: "First private lesson. Building water confidence.", author: "staff_inst2" }] },
];

export const households: Household[] = [
  { id: "hh_1", orgId: ORG_ID, name: "Carter Family", primaryContact: "Jennifer Carter", email: "jcarter@example.com", phone: "(555) 412-7781", address: "22 Birch Ln, Cedar Falls", membershipStatus: "active", waiverSigned: true, memberIds: ["mem_1", "mem_2"], notes: "Season pass holders since 2023." },
  { id: "hh_2", orgId: ORG_ID, name: "Nguyen Family", primaryContact: "Hai Nguyen", email: "hnguyen@example.com", phone: "(555) 412-3392", address: "104 Cedar St, Cedar Falls", membershipStatus: "active", waiverSigned: true, memberIds: ["mem_3", "mem_4"] },
  { id: "hh_3", orgId: ORG_ID, name: "Brooks Family", primaryContact: "Tanya Brooks", email: "tbrooks@example.com", phone: "(555) 412-9090", address: "58 Lakeview Dr, Cedar Falls", membershipStatus: "active", waiverSigned: false, memberIds: ["mem_5", "mem_6"], notes: "Waiver pending signature." },
  { id: "hh_4", orgId: ORG_ID, name: "Rivera Family", primaryContact: "Carlos Rivera", email: "crivera@example.com", phone: "(555) 412-5512", address: "9 Sunset Ct, Cedar Falls", membershipStatus: "active", waiverSigned: true, memberIds: ["mem_7", "mem_8"] },
  { id: "hh_5", orgId: ORG_ID, name: "Okafor Family", primaryContact: "Ada Okafor", email: "aokafor@example.com", phone: "(555) 412-1188", address: "300 Riverbend Pkwy, Cedar Falls", membershipStatus: "expired", waiverSigned: true, memberIds: ["mem_9"], notes: "Renewal reminder sent." },
  { id: "hh_6", orgId: ORG_ID, name: "Thompson Family", primaryContact: "Greg Thompson", email: "gthompson@example.com", phone: "(555) 412-7744", address: "17 Maple Ct, Cedar Falls", membershipStatus: "pending", waiverSigned: false, memberIds: ["mem_10"], notes: "New application — awaiting payment." },
];

export const members: Member[] = [
  { id: "mem_1", householdId: "hh_1", firstName: "Jennifer", lastName: "Carter", age: 38, isPrimary: true },
  { id: "mem_2", householdId: "hh_1", firstName: "Mia", lastName: "Carter", age: 5, isPrimary: false },
  { id: "mem_3", householdId: "hh_2", firstName: "Hai", lastName: "Nguyen", age: 41, isPrimary: true },
  { id: "mem_4", householdId: "hh_2", firstName: "Leo", lastName: "Nguyen", age: 6, isPrimary: false },
  { id: "mem_5", householdId: "hh_3", firstName: "Tanya", lastName: "Brooks", age: 36, isPrimary: true },
  { id: "mem_6", householdId: "hh_3", firstName: "Ava", lastName: "Brooks", age: 10, isPrimary: false },
  { id: "mem_7", householdId: "hh_4", firstName: "Carlos", lastName: "Rivera", age: 44, isPrimary: true },
  { id: "mem_8", householdId: "hh_4", firstName: "Maddie", lastName: "Rivera", age: 8, isPrimary: false },
  { id: "mem_9", householdId: "hh_5", firstName: "Ada", lastName: "Okafor", age: 33, isPrimary: true },
  { id: "mem_10", householdId: "hh_6", firstName: "Greg", lastName: "Thompson", age: 47, isPrimary: true },
];

/* -------------------------------------------------------------------------- */
/* Notifications & audit log                                                   */
/* -------------------------------------------------------------------------- */

export const notifications: Notification[] = [
  { id: "ntf_1", kind: "approval", title: "3 pending time-off requests", body: "Maya, Aria, and Chloe are awaiting your approval.", at: isoOffset(0, now), read: false, href: "/schedule" },
  { id: "ntf_2", kind: "alert", title: "Chemical out of range", body: "Riverbend free chlorine spiked to 5.2 ppm after shock.", at: isoOffset(0, now), read: false, href: "/chemicals" },
  { id: "ntf_3", kind: "alert", title: "Certification expired", body: "Noah Berg's lifeguard certification has expired.", at: isoOffset(0, now), read: false, href: "/certifications" },
  { id: "ntf_4", kind: "reminder", title: "Onboarding incomplete", body: "Ethan Cole and Liam Nguyen have missing forms.", at: isoOffset(-1, now), read: true, href: "/onboarding" },
  { id: "ntf_5", kind: "alert", title: "Urgent maintenance", body: "Lakeside circulation pump needs parts.", at: isoOffset(-1, now), read: true, href: "/maintenance" },
  { id: "ntf_6", kind: "message", title: "New announcement", body: "Schedule for next week has been published.", at: isoOffset(-1, now), read: true, href: "/chat" },
];

export const auditLog: AuditLog[] = [
  { id: "al_1", actorId: "staff_payroll", action: "Viewed payroll register", target: "Pay period Jun 1–14", at: isoOffset(0, now), sensitive: true },
  { id: "al_2", actorId: "staff_hr", action: "Accessed tax document", target: "I-9 template", at: isoOffset(0, now), sensitive: true },
  { id: "al_3", actorId: "staff_guardmgr", action: "Approved time-off request", target: "Jack Monroe", at: isoOffset(-1, now), sensitive: false },
  { id: "al_4", actorId: "staff_director", action: "Published schedule", target: "Week of " + weekDateKey(0), at: isoOffset(-1, now), sensitive: false },
  { id: "al_5", actorId: "staff_ops", action: "Logged chemical reading", target: "Riverbend indoor pool", at: isoOffset(0, now), sensitive: false },
  { id: "al_6", actorId: "staff_auditor", action: "Exported compliance report", target: "May inspections", at: isoOffset(-2, now), sensitive: false },
];
