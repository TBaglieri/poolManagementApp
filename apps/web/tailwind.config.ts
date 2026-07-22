import type { Config } from "tailwindcss";

/**
 * Brand palettes are driven by CSS custom properties injected per-tenant at the
 * app root (see @/components/theme/theme-injector). Components keep using
 * `bg-brand-500`, `text-navy-900`, etc. unchanged — those now resolve to the
 * active tenant's theme. Default variable values live in globals.css and equal
 * the app's original palette, so with no tenant override nothing changes visually.
 */
const STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

function tokenScale(name: string): Record<string, string> {
  return Object.fromEntries(
    STOPS.map((s) => [String(s), `rgb(var(--${name}-${s}) / <alpha-value>)`]),
  );
}

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: tokenScale("brand"),
        navy: tokenScale("navy"),
      },
      fontFamily: {
        sans: [
          "var(--font-brand)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto",
          "Helvetica Neue", "Arial", "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 29, 46, 0.04), 0 1px 3px 0 rgba(15, 29, 46, 0.06)",
        soft: "0 4px 16px -2px rgba(15, 29, 46, 0.08), 0 2px 6px -2px rgba(15, 29, 46, 0.06)",
        lift: "0 12px 32px -8px rgba(8, 51, 68, 0.18)",
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "scale-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        ripple: {
          "0%": { transform: "scale(0.6)", opacity: "0.55" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        "waterline": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.18s ease-out",
        "slide-in-right": "slide-in-right 0.25s ease-out",
        ripple: "ripple 1.8s ease-out infinite",
        waterline: "waterline 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
