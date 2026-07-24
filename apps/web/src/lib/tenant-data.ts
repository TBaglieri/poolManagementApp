"use client";

/**
 * Tenant-scoped reference data (React hook).
 *
 * The bundled sample collections (facilities, staff, certifications, lessons, …)
 * are the DEMO tenant's data. A real tenant must never see them, so this returns
 * the demo dataset ONLY for the demo tenant and EMPTY arrays otherwise. Pages read
 * reference data through this hook instead of importing the seed directly. The
 * pure resolver lives in tenant-seed.ts (unit-tested).
 */
import { isDemoTenant } from "@poolops/shared";
import { useTenantConfig } from "./tenant/provider";
import { useDemo } from "./store";
import { tenantSeed, type TenantSeed } from "./tenant-seed";

export { tenantSeed };
export type { TenantSeed };

export function useTenantSeed(): TenantSeed {
  const config = useTenantConfig();
  const base = tenantSeed(isDemoTenant(config));
  // Facilities + pools are authoritative in the store (so a created facility shows
  // up everywhere). Fall back to the static base only until the store is populated
  // — for the demo tenant that's the brief window before DemoSeeder runs. See
  // store.ts and AUDIT.md.
  const storeFacilities = useDemo((s) => s.facilities);
  const storePools = useDemo((s) => s.pools);
  return {
    ...base,
    facilities: storeFacilities.length ? storeFacilities : base.facilities,
    pools: storePools.length ? storePools : base.pools,
  };
}

/**
 * Resolve a facility's display name from the STORE first (so a runtime-created
 * facility resolves), then the static seed. Use this instead of the shared
 * `facilityName()` on screens that can show a just-created facility.
 */
export function useFacilityNames(): (id: string | null | undefined) => string {
  const facilities = useTenantSeed().facilities;
  return (id) => facilities.find((f) => f.id === id)?.name ?? "All Facilities";
}
