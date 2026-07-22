"use client";

/**
 * Tiny dependency-free CSV export. Builds a spreadsheet-safe CSV string from an
 * array of row objects and triggers a browser download. Used by payroll, time
 * clock, chemical logs, and any other "Export" button.
 */

type Cell = string | number | boolean | null | undefined;

function escapeCell(value: Cell): string {
  if (value == null) return "";
  const str = String(value);
  // Quote if it contains a comma, quote, or newline; double up embedded quotes.
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/** Build a CSV string. `columns` fixes header order and labels. */
export function toCSV<T extends Record<string, Cell>>(
  rows: T[],
  columns: { key: keyof T; label: string }[],
): string {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(",")).join("\r\n");
  return `${header}\r\n${body}`;
}

/** Build the CSV and download it as `<filename>.csv`. No-op outside the browser. */
export function downloadCSV<T extends Record<string, Cell>>(
  filename: string,
  rows: T[],
  columns: { key: keyof T; label: string }[],
): void {
  if (typeof document === "undefined") return;
  const csv = toCSV(rows, columns);
  // Prepend a BOM so Excel opens UTF-8 correctly.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
