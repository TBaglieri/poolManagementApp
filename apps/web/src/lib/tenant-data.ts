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
import { tenantSeed, type TenantSeed } from "./tenant-seed";

export { tenantSeed };
export type { TenantSeed };

export function useTenantSeed(): TenantSeed {
  const config = useTenantConfig();
  return tenantSeed(isDemoTenant(config));
}
