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
import type { TenantConfig, TenantConfigInput } from "./schema";

export const TENANT_INPUTS: Record<string, TenantConfigInput> = {
  // Platform default / base look (the app's original cyan/navy).
  default: { slug: "default", displayName: "PoolOps Pro" },

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
    branding: { monogram: "VR", fontFamily: "Inter" },
    theme: HUDSON_THEME,
    copy: {
      tagline: "Your community pool, run smoothly.",
      welcome: "Welcome to the Villas on the Ridge pool portal.",
      rules: "Residents and guests must follow all posted pool rules. Children under 12 require adult supervision. Guest limit and pool hours are set by the Board.",
      emailFooter: "Sent by the Villas on the Ridge pool management team.",
      notificationSender: "Villas on the Ridge Pool",
    },
    // A small community pool: no swim-lessons program, no cross-facility network.
    features: { lessons: false, community: false },
    roleLabels: {
      org_admin: "Board",
      ops_manager: "Pool Manager",
      hr_coordinator: "Membership",
      head_lifeguard: "Head Guard",
      lifeguard: "Lifeguard",
      maintenance: "Maintenance",
    },
    operations: {
      poolHours: "9:00 AM – 8:00 PM",
      seasonStart: "05-24",
      seasonEnd: "09-07",
      maxGuestsPerMember: 2,
      reservationSlotMinutes: 45,
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

export function isKnownTenant(slug?: string | null): boolean {
  return !!slug && slug.toLowerCase() in TENANT_INPUTS;
}

export function listTenants(): TenantConfig[] {
  return KNOWN_TENANT_SLUGS.map((s) => getTenantConfig(s));
}
