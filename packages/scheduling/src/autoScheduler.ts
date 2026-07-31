import {
  shiftDuration, dateKey, uid, randomUuid, staffName,
  type CertificationType, type ID, type RoleSlug, type ShiftPosition, type StaffProfile,
} from "@poolops/shared";
import type {
  AvoidedConflict, DraftShift, DraftStatus, DraftWarning, GenerateInput, ScheduleDraft,
  StaffHourTotal,
} from "./types";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const POSITION_ROLES: Record<ShiftPosition, RoleSlug[]> = {
  lifeguard: ["lifeguard", "head_lifeguard"],
  head_lifeguard: ["head_lifeguard", "lifeguard_manager", "ops_manager"],
  swim_instructor: ["swim_instructor"],
  front_desk: ["lifeguard", "head_lifeguard"],
  maintenance: ["maintenance"],
  manager: ["ops_manager", "lifeguard_manager", "org_admin"],
};

function addDays(yyyymmdd: string, days: number): string {
  const d = new Date(yyyymmdd + "T00:00:00");
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

/** Monday (yyyy-mm-dd) of the week `weeksAhead` from `from`. */
export function mondayOf(weeksAhead = 0, from: Date = new Date()): string {
  const d = new Date(from);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset + weeksAhead * 7);
  d.setHours(0, 0, 0, 0);
  return dateKey(d);
}

function positionEligible(staff: StaffProfile, position: ShiftPosition): boolean {
  return staff.roles.some((r) => POSITION_ROLES[position].includes(r));
}

function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Deterministic auto-schedule builder. Builds required slots from a staffing
 * template, assigns the best eligible staff while honouring time off, availability,
 * certifications, double-booking, and hour limits, then returns a reviewable draft.
 */
export function generateScheduleDraft(input: GenerateInput): ScheduleDraft {
  const { template, staff, approvedTimeOff, certifications, settings, generatedBy, priorHours = {} } = input;
  const { weekStart, includeOpenShifts, priority, avoidOvertime, maxHoursDefault } = settings;

  const targetFacilityIds =
    settings.facilityId === "all" ? null : new Set([settings.facilityId]);
  const requirements = template.requirements.filter(
    (r) => !targetFacilityIds || targetFacilityIds.has(r.facilityId),
  );

  const hours: Record<ID, number> = {};
  const shiftCount: Record<ID, number> = {};
  staff.forEach((s) => { hours[s.id] = priorHours[s.id] ?? 0; });
  const assigned: Record<ID, { date: string; start: string; end: string }[]> = {};

  const certOf = (staffId: ID, type: CertificationType) =>
    certifications.find((c) => c.staffId === staffId && c.type === type);
  const hasValidCert = (staffId: ID, type: CertificationType) => {
    const c = certOf(staffId, type);
    return !!c && (c.status === "valid" || c.status === "expiring");
  };

  const isOnApprovedTimeOff = (staffId: ID, date: string) =>
    approvedTimeOff.some(
      (r) => r.staffId === staffId && r.status === "approved" &&
        date >= dateKey(r.startDate) && date <= dateKey(r.endDate),
    );

  const isAvailable = (s: StaffProfile, dayIdx: number, start: string, end: string) => {
    const block = s.availability.find((b) => b.day === DAY_KEYS[dayIdx]);
    if (!block) return true;
    if (block.preference === "unavailable") return false;
    return timesOverlap(block.start, block.end, start, end);
  };

  const prefScore = (s: StaffProfile, dayIdx: number) => {
    const block = s.availability.find((b) => b.day === DAY_KEYS[dayIdx]);
    return block?.preference === "preferred" ? 0 : 1;
  };

  const draftShifts: DraftShift[] = [];
  const avoided: AvoidedConflict[] = [];
  const avoidedKeys = new Set<string>();
  const addAvoided = (c: AvoidedConflict, key: string) => {
    if (!avoidedKeys.has(key)) { avoidedKeys.add(key); avoided.push(c); }
  };

  // Record approved time-off that falls within the target week (shown as "avoided").
  const weekEnd = addDays(weekStart, 6);
  approvedTimeOff.forEach((r) => {
    if (r.status !== "approved") return;
    if (dateKey(r.startDate) <= weekEnd && dateKey(r.endDate) >= weekStart) {
      addAvoided(
        { type: "time_off", staffId: r.staffId, detail: `${staffName(r.staffId)} — approved ${r.type} time off respected` },
        `to:${r.id}`,
      );
    }
  });

  let totalSlots = 0;
  let filled = 0;

  for (const req of requirements) {
    const slotHours = shiftDuration(req.start, req.end);
    for (const dayIdx of req.daysOfWeek) {
      const date = addDays(weekStart, dayIdx);
      for (let n = 0; n < req.staffCount; n++) {
        totalSlots++;

        let pool = staff.filter((s) => s.facilityIds.includes(req.facilityId) && positionEligible(s, req.position));

        pool = pool.filter((s) => {
          if (isOnApprovedTimeOff(s.id, date)) return false;
          if (!isAvailable(s, dayIdx, req.start, req.end)) {
            addAvoided({ type: "availability", staffId: s.id, detail: `${staffName(s.id)} unavailable ${DAY_KEYS[dayIdx]}` }, `av:${s.id}:${dayIdx}`);
            return false;
          }
          if ((assigned[s.id] ?? []).some((a) => a.date === date && timesOverlap(a.start, a.end, req.start, req.end))) {
            addAvoided({ type: "double_book", staffId: s.id, detail: `${staffName(s.id)} already booked ${date}` }, `db:${s.id}:${date}:${req.start}`);
            return false;
          }
          return true;
        });

        if (req.certificationRequired) {
          const need = req.certificationRequired;
          pool.filter((s) => !hasValidCert(s.id, need)).forEach((s) =>
            addAvoided({ type: "missing_cert", staffId: s.id, detail: `${staffName(s.id)} excluded — ${need} not current` }, `mc:${s.id}:${need}`),
          );
          pool = pool.filter((s) => hasValidCert(s.id, need));
        }

        let ranked = pool;
        if (avoidOvertime) {
          const nonOt = pool.filter((s) => hours[s.id] + slotHours <= maxHoursDefault);
          if (nonOt.length) ranked = nonOt;
        }

        ranked = [...ranked].sort((a, b) => {
          if (priority === "preferences") {
            const d = prefScore(a, dayIdx) - prefScore(b, dayIdx);
            if (d !== 0) return d;
          }
          if (hours[a.id] !== hours[b.id]) return hours[a.id] - hours[b.id];
          return a.id.localeCompare(b.id);
        });

        const pick = ranked[0];
        const base = {
          id: uid("ds"), facilityId: req.facilityId, date, position: req.position,
          certificationRequired: req.certificationRequired, start: req.start, end: req.end,
          hours: slotHours, label: req.label,
        };

        if (pick) {
          filled++;
          hours[pick.id] += slotHours;
          shiftCount[pick.id] = (shiftCount[pick.id] ?? 0) + 1;
          (assigned[pick.id] ??= []).push({ date, start: req.start, end: req.end });
          const warnings: DraftWarning[] = [];
          if (hours[pick.id] > maxHoursDefault) {
            warnings.push({ type: "overtime", staffId: pick.id, message: `${staffName(pick.id)} now at ${hours[pick.id]}h this week (over ${maxHoursDefault}h)` });
          }
          if (pick.isMinor && (req.end > "20:00" || slotHours > 8)) {
            warnings.push({ type: "minor", staffId: pick.id, message: `${staffName(pick.id)} is under 18 — verify minor labor rules for this ${req.end} shift` });
          }
          draftShifts.push({ ...base, assignedStaffId: pick.id, isOpenShift: false, warnings });
        } else {
          draftShifts.push({
            ...base, assignedStaffId: null, isOpenShift: includeOpenShifts,
            warnings: [{ type: "coverage_gap", message: `No eligible staff for ${req.label} on ${date}` }],
          });
        }
      }
    }
  }

  const unfilled = draftShifts.filter((s) => !s.assignedStaffId);
  const coverageScore = totalSlots ? Math.round((filled / totalSlots) * 100) : 100;

  const staffHourTotals: StaffHourTotal[] = staff
    .map((s) => ({
      staffId: s.id, name: staffName(s.id), hours: hours[s.id], shifts: shiftCount[s.id] ?? 0,
      preferredMax: s.preferredHoursPerWeek, overtime: hours[s.id] > maxHoursDefault,
    }))
    .filter((t) => t.shifts > 0 || (priorHours[t.staffId] ?? 0) > 0)
    .sort((a, b) => b.hours - a.hours);

  // De-duplicated draft-level warnings.
  const seen = new Set<string>();
  const warnings: DraftWarning[] = [];
  draftShifts.flatMap((s) => s.warnings).forEach((w) => {
    const key = `${w.type}:${w.message}`;
    if (!seen.has(key)) { seen.add(key); warnings.push(w); }
  });

  const suggestedFixes: string[] = [];
  if (unfilled.length) suggestedFixes.push(`${unfilled.length} slot${unfilled.length > 1 ? "s" : ""} could not be filled — post as open shifts or recruit coverage.`);
  staffHourTotals.filter((t) => t.overtime).forEach((t) => suggestedFixes.push(`${t.name} is over ${maxHoursDefault}h (${t.hours}h) — redistribute shifts to avoid overtime.`));
  const minorWarn = warnings.filter((w) => w.type === "minor");
  if (minorWarn.length) suggestedFixes.push(`${minorWarn.length} minor labor-rule flag${minorWarn.length > 1 ? "s" : ""} — review state rules before publishing.`);
  if (suggestedFixes.length === 0) suggestedFixes.push("Looks balanced — review and publish when ready.");

  let status: DraftStatus = "ready";
  if (coverageScore < 40) status = "failed";
  else if (unfilled.length > 0 || warnings.length > 0) status = "needs_review";

  return {
    id: randomUuid(), facilityId: settings.facilityId, weekStart, status, generatedBy,
    generatedAt: new Date().toISOString(), settings, shifts: draftShifts, warnings,
    coverageScore, staffHourTotals, unfilledCount: unfilled.length,
    avoidedConflicts: avoided, suggestedFixes,
  };
}
