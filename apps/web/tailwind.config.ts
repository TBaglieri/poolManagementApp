import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Aquatic brand — cyan/teal family
        brand: {
          50: "#ECFEFF", 100: "#CFFAFE", 200: "#A5F3FC", 300: "#67E8F9",
          400: "#22D3EE", 500: "#06B6D4", 600: "#0891B2", 700: "#0E7490",
          800: "#155E75", 900: "#164E63", 950: "#083344",
        },
        navy: {
          50: "#eef3f8", 100: "#d6e1ee", 200: "#aec3dc", 300: "#7f9ec5",
          400: "#5076a8", 500: "#345a8c", 600: "#284872", 700: "#223c5e",
          800: "#16273d", 900: "#0f1d2e", 950: "#0a1521",
        },
      },
      fontFamily: {
        sans: [
          "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto",
          "Helvetica Neue", "Arial", "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 29, 46, 0.04), 0 1px 3px 0 rgba(15, 29, 46, 0.06)",
        soft: "0 4px 16px -2px rgba(15, 29, 46, 0.08), 0 2px 6px -2px rgba(15, 29, 46, 0.06)",
        lift: "0 12px 32px -8px rgba(8, 51, 68, 0.18)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
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
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.18s ease-out",
        "slide-in-right": "slide-in-right 0.25s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
