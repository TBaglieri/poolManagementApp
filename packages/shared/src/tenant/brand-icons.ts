/**
 * Inline, theme-colorable brand marks. A tenant references one from its config as
 * `branding.icon = "inline:<id>"`. Because these are vector paths (not raster), the
 * same mark renders crisp at 16px (favicon) or 1200px (OG card) and inherits the
 * tenant's color. Pure data + string builders (no React/DOM), so the React icon,
 * the favicon data-URI, and the next/og social card can all share one source.
 *
 * White-label: this is the DEFAULT library of built-in marks. A tenant may instead
 * point `branding.icon` at its own asset URL — inline marks are just a convenience
 * so a tenant with clean line art (like Villas' townhouses) needs no raster files.
 */
export interface InlineIcon {
  viewBox: string;
  /** Stroked path `d` values (fill:none, stroke:currentColor). */
  paths: string[];
}

export const INLINE_ICONS: Record<string, InlineIcon> = {
  // PoolOps Pro (the PLATFORM brand) — three water waves.
  waves: {
    viewBox: "0 0 24 24",
    paths: [
      "M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
      "M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
      "M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
    ],
  },

  // Villas on the Ridge — a row of three gabled townhouses on a ridge (line art).
  houses: {
    viewBox: "0 0 64 44",
    paths: [
      "M3 20 L13 9 L23 20",   // roof — left house
      "M22 20 L32 6 L42 20",  // roof — center house (tallest)
      "M41 20 L51 9 L61 20",  // roof — right house
      "M5 19 V40",            // left house — outer walls
      "M21 19 V40",
      "M24 19 V40",           // center house
      "M40 19 V40",
      "M43 19 V40",           // right house
      "M59 19 V40",
      "M2 40 H62",            // ground line
      "M10 40 V31 H16 V40",   // doors
      "M29 40 V30 H35 V40",
      "M48 40 V31 H54 V40",
    ],
  },
};

/** If `icon` is a valid "inline:<id>" reference, return the id; else null. */
export function inlineIconId(icon?: string | null): string | null {
  if (!icon) return null;
  const m = /^inline:(.+)$/.exec(icon);
  return m && INLINE_ICONS[m[1]] ? m[1] : null;
}

/** Serialize an inline icon to a standalone `<svg>…</svg>` string (favicon/OG use). */
export function inlineIconSvg(
  id: string,
  { color = "currentColor", stroke = 3, size = 64 }: { color?: string; stroke?: number; size?: number } = {},
): string {
  const def = INLINE_ICONS[id];
  if (!def) return "";
  const paths = def.paths.map((d) => `<path d="${d}"/>`).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${def.viewBox}" width="${size}" height="${size}" ` +
    `fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
  );
}
