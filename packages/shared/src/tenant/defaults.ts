/**
 * DEFAULT_TENANT_CONFIG — the base every tenant deep-merges on top of.
 *
 * A new tenant that supplies only a name and a primary color must still produce
 * a complete, working, good-looking site: those gaps are filled from here.
 *
 * The explicit `brandScale`/`navyScale` reproduce the app's *current* Tailwind
 * palette exactly, so with no tenant override the UI is pixel-identical to before
 * the theming system was added.
 */
import type { TenantConfig } from "./schema";
import { defaultFeatureMap, defaultSubFeatureMap } from "./modules";
import { TENANT_ROLE_SLUGS } from "../rbac/roles";

/** The app's original cyan/teal brand scale (kept verbatim for the default). */
export const DEFAULT_BRAND_SCALE: Record<string, string> = {
  "50": "#ECFEFF", "100": "#CFFAFE", "200": "#A5F3FC", "300": "#67E8F9",
  "400": "#22D3EE", "500": "#06B6D4", "600": "#0891B2", "700": "#0E7490",
  "800": "#155E75", "900": "#164E63", "950": "#083344",
};

/** The app's original navy sidebar scale (kept verbatim for the default). */
export const DEFAULT_NAVY_SCALE: Record<string, string> = {
  "50": "#eef3f8", "100": "#d6e1ee", "200": "#aec3dc", "300": "#7f9ec5",
  "400": "#5076a8", "500": "#345a8c", "600": "#284872", "700": "#223c5e",
  "800": "#16273d", "900": "#0f1d2e", "950": "#0a1521",
};

export const DEFAULT_CHEMICAL_RANGES = {
  freeChlorine: [1.0, 4.0] as [number, number],
  combinedChlorine: [0, 0.4] as [number, number],
  ph: [7.2, 7.8] as [number, number],
  alkalinity: [80, 120] as [number, number],
  calciumHardness: [200, 400] as [number, number],
  cyanuricAcid: [30, 50] as [number, number],
  waterTemp: [78, 86] as [number, number],
};

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  slug: "default",
  displayName: "PoolOps Pro",
  legalName: "PoolOps Pro",
  productName: "PoolOps Pro",
  organizationType: "community_pool",
  address: "",
  timezone: "America/New_York",
  contact: { email: "", phone: "" },
  branding: {
    fontFamily: "Inter",
    monogram: "PO",
  },
  theme: {
    brand: "#0891B2",
    secondary: "#16273d",
    accent: "#0E7490",
    neutral: "slate",
    radius: "soft",
    density: "comfortable",
    defaultScheme: "light",
    allowUserScheme: true,
    // No explicit brandScale/navyScale here on purpose: a tenant that only sets
    // `theme.brand` gets a *generated* scale from their color. Tenants that want
    // the app's original cyan/navy (default, tidetown) set the explicit scales in
    // their own registry entry — see tenant/registry.ts — so they don't leak here.
    customVars: {},
  },
  copy: {
    tagline: "Aquatics & community-pool operations, all in one place.",
    welcome: "Welcome back. Here's what's happening at your pool today.",
    rules: "Please review your facility's posted rules and safety procedures.",
    emailFooter: "Sent by PoolOps Pro on behalf of your pool.",
    notificationSender: "PoolOps Pro",
  },
  features: defaultFeatureMap(),
  subFeatures: defaultSubFeatureMap(),
  roleLabels: {},
  // By default a tenant can use the whole role hierarchy; a tenant enables the
  // subset it needs (e.g. Villas runs just Admin/Pool Manager + Lifeguard).
  activeRoles: [...TENANT_ROLE_SLUGS],
  operations: {
    poolHours: "6:00 AM – 8:00 PM",
    seasonStart: "05-15",
    seasonEnd: "09-15",
    maxGuestsPerMember: 4,
    reservationSlotMinutes: 60,
    chemicalUnit: "ppm",
    chemicalRanges: DEFAULT_CHEMICAL_RANGES,
  },
};
