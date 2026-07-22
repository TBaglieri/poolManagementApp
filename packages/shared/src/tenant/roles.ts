/**
 * Tenant-configurable role labels.
 *
 * The underlying permission set is fixed and enforced centrally; only the display
 * label changes per tenant (one pool says "Board", another "HOA Committee").
 */
import type { RoleSlug } from "../types";
import { getRole } from "../rbac/roles";
import type { TenantConfig } from "./schema";

/** Full display name for a role, honoring the tenant's label override. */
export function resolveRoleLabel(config: TenantConfig, slug: RoleSlug): string {
  return config.roleLabels[slug] ?? getRole(slug).name;
}

/** Short display name for a role (sidebar/badges), honoring the override. */
export function resolveRoleShortLabel(config: TenantConfig, slug: RoleSlug): string {
  return config.roleLabels[slug] ?? getRole(slug).shortName;
}
