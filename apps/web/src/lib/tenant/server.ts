import "server-only";
import { headers, cookies } from "next/headers";
import { getTenantConfig, type TenantConfig } from "@poolops/shared";

/** Deployment default tenant. For this trial it's the customer, Villas on the Ridge. */
export const DEFAULT_TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT || "villas";

/** Active tenant slug for the current request (set by middleware; cookie fallback). */
export function getTenantSlug(): string {
  const fromHeader = headers().get("x-tenant-slug");
  if (fromHeader) return fromHeader;
  const fromCookie = cookies().get("tenant")?.value;
  return fromCookie || DEFAULT_TENANT_SLUG;
}

/** Resolved, validated tenant config for the current request. */
export function getServerTenantConfig(): TenantConfig {
  return getTenantConfig(getTenantSlug());
}
