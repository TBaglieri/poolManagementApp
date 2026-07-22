/**
 * Standalone verification of the Auto Schedule Builder engine.
 * Run: npx tsx scripts/verify-scheduler.ts
 */
import {
  facilities, staff as seedStaff, staffCertifications, timeOffRequests,
} from "@poolops/shared";
import {
  generateScheduleDraft, demoStaffingTemplates, buildDemoTimeOff, demoPriorHours,
  applyScenarioStaff, mondayOf,
} from "@poolops/scheduling";

const weekStart = mondayOf(1); // next week
const approvedTimeOff = [
  ...buildDemoTimeOff(weekStart),
  ...timeOffRequests.filter((r) => r.status === "approved"),
];

const draft = generateScheduleDraft({
  facilities,
  template: demoStaffingTemplates[0],
  staff: applyScenarioStaff(seedStaff),
  approvedTimeOff,
  certifications: staffCertifications,
  settings: {
    facilityId: "all", weekStart, templateId: "tmpl_summer",
    includeOpenShifts: true, priority: "balanced", avoidOvertime: false, maxHoursDefault: 40,
  },
  generatedBy: "staff_director",
  priorHours: demoPriorHours,
});

const timeOffAvoided = draft.avoidedConflicts.filter((c) => c.type === "time_off").length;
const certAvoided = draft.avoidedConflicts.filter((c) => c.type === "missing_cert").length;
const overtime = draft.staffHourTotals.filter((t) => t.overtime).length;
const minorWarnings = draft.warnings.filter((w) => w.type === "minor").length;

console.log("=== Auto Schedule Builder verification ===");
console.log("Week starting:        ", weekStart);
console.log("Draft status:         ", draft.status);
console.log("Total draft shifts:   ", draft.shifts.length);
console.log("Filled shifts:        ", draft.shifts.filter((s) => s.assignedStaffId).length);
console.log("Open/unfilled shifts: ", draft.unfilledCount);
console.log("Coverage score:       ", draft.coverageScore + "%");
console.log("Time-off respected:   ", timeOffAvoided);
console.log("Cert exclusions:      ", certAvoided);
console.log("Overtime flags:       ", overtime);
console.log("Minor labor warnings: ", minorWarnings);
console.log("Total warnings:       ", draft.warnings.length);
console.log("Suggested fixes:      ", draft.suggestedFixes.length);
console.log("\nSample avoided conflicts:");
draft.avoidedConflicts.slice(0, 4).forEach((c) => console.log("  -", c.detail));

const checks = [
  ["draft has shifts", draft.shifts.length > 0],
  ["coverage score is a percentage", draft.coverageScore >= 0 && draft.coverageScore <= 100],
  ["approved time-off was respected (>=3)", timeOffAvoided >= 3],
  ["at least one open/unfilled shift generated", draft.unfilledCount > 0],
  ["staff hour totals computed", draft.staffHourTotals.length > 0],
  ["suggested fixes present", draft.suggestedFixes.length > 0],
];
console.log("\n=== Assertions ===");
let ok = true;
for (const [label, pass] of checks) {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}`);
  if (!pass) ok = false;
}
console.log(ok ? "\nALL CHECKS PASSED ✅" : "\nSOME CHECKS FAILED ❌");
process.exit(ok ? 0 : 1);
