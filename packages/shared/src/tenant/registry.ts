/**
 * Tenant registry — the built-in "configuration records".
 *
 * Every tenant is a config record, not a code fork. In mock/demo mode these are
 * the source of truth; in supabase mode they seed `organizations.config` and act
 * as the fallback. Add a pool by adding one entry here (or via the admin UI /
 * ONBOARDING.md) — never by branching component code.
 */
import { resolveTenantConfig } from "./resolve";
import { HUDSON_THEME } from "./presets";
import { DEFAULT_BRAND_SCALE, DEFAULT_NAVY_SCALE } from "./defaults";
import type { TenantConfig, TenantConfigInput } from "./schema";

/** The app's original cyan/navy look, kept pixel-identical via explicit scales. */
const ORIGINAL_LOOK = { brandScale: DEFAULT_BRAND_SCALE, navyScale: DEFAULT_NAVY_SCALE };

/**
 * The PLATFORM brand (PoolOps Pro) — a FIRST-CLASS config, not a tenant. It is what
 * platform-level surfaces (landing, root login, marketing) and their metadata render,
 * so a tenant's branding never leaks onto non-tenant pages. It is NOT in the tenant
 * registry (can't be reached as a tenant) and no tenant can overwrite it.
 */
export const PLATFORM_SLUG = "platform";

/** True for the reserved platform slug (never a real tenant). */
export function isPlatformSlug(slug?: string | null): boolean {
  return (slug ?? "").toLowerCase() === PLATFORM_SLUG;
}

/** The resolved PoolOps Pro platform config (waves mark, platform copy, base look). */
export const PLATFORM_CONFIG: TenantConfig = resolveTenantConfig({
  slug: PLATFORM_SLUG,
  displayName: "PoolOps Pro",
  legalName: "PoolOps Pro",
  productName: "PoolOps Pro",
  theme: ORIGINAL_LOOK,
  branding: { monogram: "PO", icon: "inline:waves" },
  copy: {
    tagline: "The operations layer for modern aquatics teams.",
    welcome: "Welcome to PoolOps Pro.",
    rules: "",
    emailFooter: "Sent by PoolOps Pro.",
    notificationSender: "PoolOps Pro",
  },
});

export const TENANT_INPUTS: Record<string, TenantConfigInput> = {
  // Platform default / base look (the app's original cyan/navy).
  default: { slug: "default", displayName: "PoolOps Pro", theme: ORIGINAL_LOOK },

  // The standalone, access-gated DEMO tenant (never public — reached only via a
  // secret token link; see middleware + ONBOARDING.md). Full roles + modules on so
  // a prospect can explore everything; the role switcher is available ONLY here.
  demo: {
    slug: "demo",
    displayName: "PoolOps Demo",
    productName: "PoolOps Pro",
    organizationType: "community_pool",
    theme: ORIGINAL_LOOK,
    branding: { monogram: "PD" },
    copy: {
      tagline: "A guided walkthrough of PoolOps Pro with realistic sample data.",
      welcome: "Welcome to the PoolOps Pro demo. Switch roles anytime from the top bar.",
      rules: "This is sample data for demonstration only.",
      emailFooter: "PoolOps Pro demo.",
      notificationSender: "PoolOps Pro Demo",
    },
  },

  // The existing bundled demo organization, on the default look.
  tidetown: {
    slug: "tidetown",
    displayName: "Tide & Town Aquatics",
    legalName: "Tide & Town Aquatics, LLC",
    productName: "PoolOps Pro",
    organizationType: "community_pool",
    address: "Cedar Falls",
    timezone: "America/Chicago",
    branding: { monogram: "TT" },
    theme: ORIGINAL_LOOK,
    copy: {
      tagline: "Aquatics operations for the whole town.",
      welcome: "Welcome back. Here's what's happening across your facilities today.",
      rules: "Please review your facility's posted rules and safety procedures.",
      emailFooter: "Sent by Tide & Town Aquatics.",
      notificationSender: "Tide & Town Aquatics",
    },
  },

  // The free-trial customer: Villas on the Ridge (Dobbs Ferry, NY).
  villas: {
    slug: "villas",
    displayName: "Villas on the Ridge",
    legalName: "Villas on the Ridge Condominium Association",
    productName: "Villas on the Ridge",
    organizationType: "community_pool",
    address: "Dobbs Ferry, New York",
    timezone: "America/New_York",
    contact: { email: "board@villasontheridge.example", phone: "(914) 555-0139" },
    // Real branded artwork (townhouse line art). Dark slate cutout for light
    // surfaces + white cutout for dark mode; derived icon/favicon/OG assets keep
    // the tab, home button and link-preview one brand. See apps/web/public/branding.
    branding: {
      monogram: "VR", fontFamily: "Inter",
      icon: "/branding/villas-icon.png",
      iconDark: "/branding/villas-icon-light.png",
      logoLight: "/branding/villas-logo.png",
      logoDark: "/branding/villas-logo-light.png",
      favicon: "/branding/villas-favicon.png",
      appleTouchIcon: "/branding/villas-touch.png",
      ogImage: "/branding/villas-og.png",
    },
    theme: HUDSON_THEME,
    copy: {
      tagline: "Your community pool, run smoothly.",
      welcome: "Welcome to the Villas on the Ridge pool portal.",
      rules: "Residents and guests must follow all posted pool rules. Children under 12 require adult supervision. Guest limit and pool hours are set by the Board.",
      emailFooter: "Sent by the Villas on the Ridge pool management team.",
      notificationSender: "Villas on the Ridge Pool",
    },
    // A small community pool. Core ops ON (chemicals, scheduling, chat, time clock,
    // staff/onboarding/certs, maintenance/incidents, checklists, shift reports,
    // documents, payroll, reports). OFF (not needed yet, all still toggleable):
    // swim lessons, members, reservations, guest passes, community network, billing,
    // formal inspections, patron counts.
    features: {
      lessons: false, members: false, reservations: false, guestPasses: false,
      community: false, billing: false, inspections: false, patronCounts: false,
    },
    // Villas runs a stripped-down TWO-role setup: an all-access Admin/Pool Manager
    // and individual Lifeguards. The full hierarchy stays available in the base
    // product — switch it on for a larger facility via config, no new code.
    activeRoles: ["org_admin", "lifeguard"],
    roleLabels: {
      org_admin: "Admin / Pool Manager",
      lifeguard: "Lifeguard",
    },
    operations: {
      poolHours: "9:00 AM – 8:00 PM",
      seasonStart: "05-24",
      seasonEnd: "09-07",
      maxGuestsPerMember: 2,
      reservationSlotMinutes: 45,
      // Villas tests its pool THREE times a day — a Villas config value, not a
      // shared-code default. Other tenants set their own (or leave it unset).
      expectedReadingsPerDay: 3,
      // Villas records only chlorine + pH each day. The rest of the panel stays
      // available in the product — a larger facility switches it back on via config.
      chemicalFields: ["freeChlorine", "ph"],
    },
  },
};

const cache = new Map<string, TenantConfig>();

/** Resolve a tenant config by slug (validated + cached). Unknown → platform default. */
export function getTenantConfig(slug?: string | null): TenantConfig {
  const key = (slug || "default").toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;
  const input = TENANT_INPUTS[key] ?? TENANT_INPUTS.default;
  const resolved = resolveTenantConfig(input);
  cache.set(key, resolved);
  return resolved;
}

export const KNOWN_TENANT_SLUGS = Object.keys(TENANT_INPUTS);

/** The gated demo tenant slug — never resolvable without a valid access token. */
export const DEMO_TENANT_SLUG = "demo";

export function isKnownTenant(slug?: string | null): boolean {
  return !!slug && slug.toLowerCase() in TENANT_INPUTS;
}

/** True for the standalone demo tenant (drives demo-only UI affordances). */
export function isDemoTenant(config: { slug: string }): boolean {
  return config.slug === DEMO_TENANT_SLUG;
}

export function listTenants(): TenantConfig[] {
  return KNOWN_TENANT_SLUGS.map((s) => getTenantConfig(s));
}
