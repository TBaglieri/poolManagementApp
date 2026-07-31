import type { ISODate } from "../types";

/* ----------------------------- ids & arrays ------------------------------ */

let _seq = 1000;
/** Deterministic-ish id for demo records created at runtime. */
export function uid(prefix = "id"): string {
  _seq += 1;
  return `${prefix}_${_seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** A real RFC-4122 UUID — required for records whose id is written to a `uuid` DB
 *  column and referenced by other rows (facilities, channels, schedule drafts,
 *  published shifts). A mock `uid()` would fail the uuid column. */
export function randomUuid(): string {
  const g = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (g?.randomUUID) return g.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

export function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

export function average(nums: number[]): number {
  return nums.length ? sum(nums) / nums.length : 0;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function groupBy<T, K extends string | number>(items: T[], key: (t: T) => K): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const k = key(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

/* ------------------------------- strings --------------------------------- */

/** "swim_club" -> "Swim Club", "cpr_aed" -> "Cpr Aed" (overridden by LABELS). */
export function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function initials(first: string, last?: string): string {
  const a = first?.[0] ?? "";
  const b = last?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

export function fullName(first: string, last: string): string {
  return `${first} ${last}`.trim();
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : plural ?? singular + "s"}`;
}

/* ------------------------------- numbers --------------------------------- */

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export function formatCurrency(value: number): string {
  return USD.format(value);
}

export function formatHours(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)} hrs`;
}

/* -------------------------------- dates ---------------------------------- */

function asDate(d: ISODate | Date): Date {
  return typeof d === "string" ? new Date(d) : d;
}

export function formatDate(d: ISODate | Date): string {
  return asDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatShortDate(d: ISODate | Date): string {
  return asDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatWeekday(d: ISODate | Date): string {
  return asDate(d).toLocaleDateString("en-US", { weekday: "short" });
}

export function formatTime(d: ISODate | Date): string {
  return asDate(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(d: ISODate | Date): string {
  return `${formatShortDate(d)} · ${formatTime(d)}`;
}

/** "9:00 AM" from a "HH:MM" 24h clock string. */
export function format24h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export function shiftDuration(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

export function daysUntil(d: ISODate | Date, from: Date = new Date()): number {
  const ms = asDate(d).getTime() - from.getTime();
  return Math.round(ms / 86_400_000);
}

export function relativeTime(d: ISODate | Date, from: Date = new Date()): string {
  const diff = asDate(d).getTime() - from.getTime();
  const abs = Math.abs(diff);
  const min = 60_000, hr = 3_600_000, day = 86_400_000;
  const fmt = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ${diff < 0 ? "ago" : "from now"}`;
  if (abs < min) return "just now";
  if (abs < hr) return fmt(Math.round(abs / min), "min");
  if (abs < day) return fmt(Math.round(abs / hr), "hr");
  if (abs < day * 30) return fmt(Math.round(abs / day), "day");
  return formatDate(d);
}

/** ISO date string offset by `days` from a base date. */
export function isoOffset(days: number, base: Date = new Date()): ISODate {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** "yyyy-mm-dd" for a date offset. */
export function dateKey(d: ISODate | Date): string {
  return asDate(d).toISOString().slice(0, 10);
}
