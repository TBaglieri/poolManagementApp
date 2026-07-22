/**
 * Preset themes — one-click looks the admin can apply live.
 *
 * A preset is just a partial theme merged onto the tenant config, so switching is
 * "change one dropdown, not one hundred files." Every preset's derived brand scale
 * is run through `ensureAccessible`, so text/buttons stay ≥ WCAG AA.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEFAULT THEME FOR VILLAS ON THE RIDGE — "Hudson Slate & Water"
 * ─────────────────────────────────────────────────────────────────────────────
 * Chosen for a small residential condo-board audience in Dobbs Ferry, in the
 * Hudson Valley. The primary is a deep, calm Hudson-water teal-blue (#0F7285) —
 * water without the neon-cyan "SaaS dashboard" energy. The sidebar/secondary is a
 * quiet slate-navy (#28323E) that reads like river stone and keeps chrome
 * understated and trustworthy to a homeowners' board. The accent is a warm
 * sandstone (#C89B6C), a nod to Hudson Valley stone, used sparingly for highlights.
 * Neutrals stay slate. It's professional and residential, not corporate SaaS.
 *
 * Verified accessible contrast pairs (see tenant/theme.test.ts):
 *   • white text on the brand-700 button          ≥ 4.5:1  (AA normal text)
 *   • brand-700 link/heading text on white surface ≥ 4.5:1  (AA normal text)
 *   • white text on the slate-950 sidebar          ≥ 12:1   (AAA)
 *   • brand-900 text on a brand-50 chip            ≥ 4.5:1  (AA normal text)
 */
import type { TenantTheme } from "./schema";

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  theme: Partial<TenantTheme>;
}

/** The Villas default, exported so the tenant config can reuse it. */
export const HUDSON_THEME: Partial<TenantTheme> = {
  brand: "#0F7285",
  secondary: "#28323E",
  accent: "#C89B6C",
  neutral: "slate",
  radius: "soft",
  density: "comfortable",
  defaultScheme: "light",
  allowUserScheme: true,
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "hudson-slate",
    name: "Hudson Slate & Water",
    description: "Calm Hudson-water teal with slate-navy chrome and warm sandstone. Professional and residential — the Villas default.",
    theme: HUDSON_THEME,
  },
  {
    id: "coastal",
    name: "Coastal Blue & Sand",
    description: "Bright coastal blue over deep sea-navy with a sand accent. Friendly and open.",
    theme: {
      brand: "#2E8BC0", secondary: "#1B3A4B", accent: "#E0B584",
      neutral: "slate", radius: "round", density: "comfortable",
      defaultScheme: "light", allowUserScheme: true,
    },
  },
  {
    id: "modern-navy",
    name: "Crisp Modern Navy",
    description: "Confident navy-blue on white with a sky accent. Clean and corporate-modern.",
    theme: {
      brand: "#2B5A8C", secondary: "#0F1D2E", accent: "#38BDF8",
      neutral: "slate", radius: "soft", density: "comfortable",
      defaultScheme: "light", allowUserScheme: true,
    },
  },
  {
    id: "warm-resort",
    name: "Warm Resort",
    description: "Turquoise water with deep teal-green chrome and a coral accent. Relaxed resort feel.",
    theme: {
      brand: "#0E9AA3", secondary: "#134E4A", accent: "#F2765C",
      neutral: "zinc", radius: "round", density: "comfortable",
      defaultScheme: "light", allowUserScheme: true,
    },
  },
  {
    id: "high-contrast",
    name: "High-Contrast Utility",
    description: "Strong blue with near-black chrome and an amber accent. Maximum legibility for phones in bright sun.",
    theme: {
      brand: "#0B5FA5", secondary: "#111827", accent: "#F59E0B",
      neutral: "slate", radius: "sharp", density: "compact",
      defaultScheme: "light", allowUserScheme: true,
    },
  },
];

export const PRESET_BY_ID: Record<string, ThemePreset> = Object.fromEntries(
  THEME_PRESETS.map((p) => [p.id, p]),
);
