/**
 * Tenant theming — color math + accessible palette generation.
 *
 * Pure functions (no React, no DOM) so they run under vitest and on the server.
 * A tenant supplies a small set of brand inputs (primary / secondary / accent);
 * this module derives a full 50–950 tint/shade scale, verifies WCAG AA contrast
 * for text-on-surface pairs, auto-adjusts failing tokens, and serializes the
 * result to CSS custom properties that Tailwind reads (`rgb(var(--brand-500)/…)`).
 */

export type RGB = [number, number, number];
export type Stop = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
export type ColorScale = Record<Stop, RGB>;

export const STOPS: Stop[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/* ------------------------------- conversions ------------------------------ */

export function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [14, 116, 144]; // fall back to brand-700
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const to = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** CSS-variable triplet, e.g. "6 182 212" for `rgb(var(--x) / <alpha>)`. */
export function toTriplet([r, g, b]: RGB): string {
  return `${Math.round(clamp(r, 0, 255))} ${Math.round(clamp(g, 0, 255))} ${Math.round(clamp(b, 0, 255))}`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const hue = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue(p, q, h + 1 / 3);
    g = hue(p, q, h);
    b = hue(p, q, h - 1 / 3);
  }
  return [r * 255, g * 255, b * 255];
}

/* --------------------------------- WCAG ----------------------------------- */

export function relativeLuminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio, 1..21. */
export function contrastRatio(a: RGB, b: RGB): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export const AA_TEXT = 4.5;
export const AA_LARGE = 3.0;

/* ---------------------------- scale generation ---------------------------- */

// Target lightness per stop; hue is preserved from the input color.
const L_ANCHOR: Record<Stop, number> = {
  50: 0.975, 100: 0.945, 200: 0.885, 300: 0.79, 400: 0.68,
  500: 0.585, 600: 0.5, 700: 0.415, 800: 0.34, 900: 0.275, 950: 0.185,
};
// Saturation multiplier so very light/dark stops don't look muddy.
const S_MULT: Record<Stop, number> = {
  50: 0.5, 100: 0.68, 200: 0.82, 300: 0.92, 400: 0.98, 500: 1,
  600: 1, 700: 0.98, 800: 0.95, 900: 0.9, 950: 0.85,
};

/** Derive a full 50–950 scale from a single brand hex, preserving its hue. */
export function buildScale(hex: string): ColorScale {
  const [h, s] = rgbToHsl(hexToRgb(hex));
  const out = {} as ColorScale;
  for (const stop of STOPS) {
    const sat = clamp(s * S_MULT[stop], 0, 1);
    out[stop] = hslToRgb(h, sat, L_ANCHOR[stop]);
  }
  return out;
}

export interface ContrastCheck {
  pair: string;
  ratio: number;
  passesAA: boolean;
}

export interface AccessibleScale {
  scale: ColorScale;
  checks: ContrastCheck[];
  warnings: string[];
}

const WHITE: RGB = [255, 255, 255];

/**
 * Verify the brand scale's text-on-surface pairs against WCAG AA and darken the
 * primary text stop (700→950) until it passes. Contrast is symmetric, so making
 * `700` clear 4.5:1 against white covers both "brand text on white" and "white
 * text on a brand-700 button". Returns any residual warnings for the admin UI.
 */
export function ensureAccessible(input: ColorScale): AccessibleScale {
  const scale: ColorScale = { ...input };
  const warnings: string[] = [];

  // Darken the primary text weight until white text on it clears AA.
  let guard = 0;
  while (contrastRatio(WHITE, scale[700]) < AA_TEXT && guard < 24) {
    for (const stop of [700, 800, 900, 950] as Stop[]) {
      const [h, s, l] = rgbToHsl(scale[stop]);
      scale[stop] = hslToRgb(h, s, Math.max(0.08, l - 0.03));
    }
    guard++;
  }
  if (contrastRatio(WHITE, scale[700]) < AA_TEXT) {
    warnings.push("Brand color is very light; primary text/buttons may be hard to read even after adjustment. Consider a darker primary.");
  } else if (guard > 0) {
    warnings.push("Brand primary was auto-darkened to meet WCAG AA contrast for text and buttons.");
  }

  const checks: ContrastCheck[] = [
    { pair: "white text on brand-700 button", ratio: contrastRatio(WHITE, scale[700]), passesAA: contrastRatio(WHITE, scale[700]) >= AA_TEXT },
    { pair: "brand-700 text on white surface", ratio: contrastRatio(scale[700], WHITE), passesAA: contrastRatio(scale[700], WHITE) >= AA_TEXT },
    { pair: "brand-600 large text on white", ratio: contrastRatio(scale[600], WHITE), passesAA: contrastRatio(scale[600], WHITE) >= AA_LARGE },
    { pair: "brand-900 on brand-50 chip", ratio: contrastRatio(scale[900], scale[50]), passesAA: contrastRatio(scale[900], scale[50]) >= AA_TEXT },
  ];
  return { scale, checks, warnings };
}

/* ----------------------------- serialization ------------------------------ */

export type ThemeVars = Record<string, string>;

/** Turn a scale into `{ "--brand-500": "6 182 212", … }`. */
export function scaleToVars(prefix: string, scale: ColorScale): ThemeVars {
  const vars: ThemeVars = {};
  for (const stop of STOPS) vars[`--${prefix}-${stop}`] = toTriplet(scale[stop]);
  return vars;
}

/** Serialize a `{ "--x": "v" }` map to a CSS rule body. */
export function varsToCss(vars: ThemeVars): string {
  return Object.entries(vars).map(([k, v]) => `${k}: ${v};`).join(" ");
}
