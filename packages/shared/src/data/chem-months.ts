/**
 * Chemical-log month grouping (Fix 7). Chem logs roll over month to month: the
 * current month is the working sheet, prior months are archived and viewable, and
 * nothing is ever deleted on rollover — records simply group by the calendar month
 * of their reading date, in the TENANT's timezone (so a late-night reading lands in
 * the right month everywhere). Pure + tz-aware so it is unit-testable.
 */

/** The month key ("YYYY-MM") a reading falls in, in the given timezone. */
export function chemMonthKey(iso: string, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit" })
      .formatToParts(new Date(iso));
    const y = parts.find((p) => p.type === "year")?.value ?? "0000";
    const m = parts.find((p) => p.type === "month")?.value ?? "01";
    return `${y}-${m}`;
  } catch {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
}

/** Human label for a month key, e.g. "2026-07" → "July 2026". */
export function chemMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** The reading's effective timestamp (taken-at, falling back to the audit time). */
export function chemLogAt(log: { takenAt?: string; recordedAt: string }): string {
  return log.takenAt ?? log.recordedAt;
}

/**
 * Distinct month keys present in `logs`, newest first, always including
 * `currentKey` (so the working sheet shows even before its first reading — "August
 * starts empty but is selectable"). `currentKey` defaults to now in `tz`.
 */
export function chemMonthsForLogs(
  logs: Array<{ takenAt?: string; recordedAt: string }>,
  tz: string,
  currentKey: string = chemMonthKey(new Date().toISOString(), tz),
): string[] {
  const set = new Set<string>([currentKey]);
  for (const l of logs) set.add(chemMonthKey(chemLogAt(l), tz));
  return [...set].sort().reverse();
}

/** Keep only the logs whose reading date falls in `monthKey` (in `tz`). */
export function chemLogsInMonth<T extends { takenAt?: string; recordedAt: string }>(
  logs: T[],
  monthKey: string,
  tz: string,
): T[] {
  return logs.filter((l) => chemMonthKey(chemLogAt(l), tz) === monthKey);
}
