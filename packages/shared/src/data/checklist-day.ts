/**
 * Fix 6 — daily-checklist domain logic (pure, tz-aware, unit-tested).
 *
 * A recurring checklist produces one instance per operating DAY. Following the chosen
 * model, the instance's window is the tenant's POOL OPERATING HOURS: it opens at
 * pool-open and is DUE by pool-close; after close it is OVERDUE (still completable, but
 * logged late). "Time remaining" counts down to close. Instances are derived from the
 * template + the calendar day (no cron) so nothing has to be pre-generated, and every
 * completion persists with the day it counts for.
 */

export interface DayWindow {
  /** Minutes from midnight (tenant-local) when the checklist opens (pool-open). */
  openMin: number;
  /** Minutes from midnight (tenant-local) it is due by (pool-close). */
  closeMin: number;
}

/** Parse an operating-hours string like "9:00 AM – 8:00 PM" → open/close minutes. */
export function parsePoolHours(hours: string | null | undefined): DayWindow | null {
  if (!hours) return null;
  const parts = hours.split(/[–—-]| to /i).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const openMin = parseClock(parts[0]);
  const closeMin = parseClock(parts[1]);
  if (openMin == null || closeMin == null) return null;
  return { openMin, closeMin };
}

/** Parse "8:00 PM" / "20:00" / "9 AM" → minutes from midnight. */
export function parseClock(s: string): number | null {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(s.trim());
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3]?.toLowerCase();
  if (h > 23 || min > 59) return null;
  if (ap === "pm" && h !== 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return h * 60 + min;
}

/** Minutes-from-midnight of an ISO instant in a timezone (for "now" or a completion time). */
export function clockMinutesInTz(iso: string, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(new Date(iso));
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return h * 60 + m;
  } catch {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  }
}

export type ChecklistState = "upcoming" | "open" | "overdue" | "complete" | "complete_late";

/**
 * State + countdown for TODAY's instance of a checklist, given its operating window,
 * the current tenant-local time (minutes), and whether it's been completed. A window
 * of null (no operating hours configured) falls back to an all-day window so the
 * checklist is always "open" until completed.
 */
export function checklistDayState(input: {
  window: DayWindow | null;
  nowMin: number;
  completed: boolean;
  completedAtMin?: number | null;
}): { state: ChecklistState; remainingMin: number; dueMin: number } {
  const openMin = input.window?.openMin ?? 0;
  const dueMin = input.window?.closeMin ?? 24 * 60;
  if (input.completed) {
    const late = input.completedAtMin != null && input.completedAtMin > dueMin;
    return { state: late ? "complete_late" : "complete", remainingMin: 0, dueMin };
  }
  if (input.nowMin < openMin) return { state: "upcoming", remainingMin: dueMin - input.nowMin, dueMin };
  if (input.nowMin <= dueMin) return { state: "open", remainingMin: dueMin - input.nowMin, dueMin };
  return { state: "overdue", remainingMin: 0, dueMin };
}

/** "3h 20m" / "12m" / "0m" from a minutes count (clamped at 0). */
export function formatRemaining(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
}

/* ------------------------------- compliance ------------------------------- */

/**
 * Chem-check compliance for a day: did the facility log at least the tenant's required
 * number of readings (Villas targets 3/day)? `required` is per-tenant config
 * (operations.expectedReadingsPerDay), NEVER hardcoded.
 */
export function chemComplianceMet(logged: number, required: number): {
  met: boolean; logged: number; required: number; shortfall: number;
} {
  const req = Math.max(0, required || 0);
  return { met: logged >= req, logged, required: req, shortfall: Math.max(0, req - logged) };
}

/** Roll up a day's checklist instances vs completions into completed/total/overdue. */
export function summarizeChecklistDay(input: {
  total: number; completed: number; overdue: number;
}): { total: number; completed: number; overdue: number; missing: number; allDone: boolean } {
  const missing = Math.max(0, input.total - input.completed);
  return { ...input, missing, allDone: input.total > 0 && input.completed >= input.total };
}

/* ------------------------------ permissions ------------------------------- */
import { getRole } from "../rbac/roles";
import type { RoleSlug } from "../types";

/** Manager tier and up (Pool Manager / facility manager) — mirrors the chat model. */
const MANAGER_MIN_LEVEL = 50;

/** Only managers/admins CREATE checklists (lifeguards complete, never create). */
export function canCreateChecklist(role: RoleSlug | null | undefined): boolean {
  return !!role && getRole(role).level >= MANAGER_MIN_LEVEL;
}

/** Only managers/admins view the compliance tracker (lifeguards see only their own). */
export function canViewCompliance(role: RoleSlug | null | undefined): boolean {
  return canCreateChecklist(role);
}
