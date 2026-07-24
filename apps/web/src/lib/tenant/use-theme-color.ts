"use client";

import { useEffect, useState } from "react";

/**
 * Read a resolved theme token (e.g. `--brand-600`) as a concrete `rgb(...)` string.
 *
 * SVG charts (recharts) set `stroke`/`fill` as attributes, which don't resolve
 * `var(--x)`. So anything drawn to a canvas/SVG must read the *computed* token value
 * at runtime instead of hardcoding a hex — that's how a chart follows the tenant's
 * palette with no per-tenant code. Falls back to `fallback` during SSR / first paint.
 */
export function useThemeColor(varName: string, fallback: string): string {
  const [color, setColor] = useState(fallback);
  useEffect(() => {
    const triplet = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (triplet) setColor(`rgb(${triplet})`);
  }, [varName]);
  return color;
}
