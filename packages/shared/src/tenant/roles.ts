/**
 * Tenant-configurable role labels.
 *
 * The underlying permission set is fixed and enforced centrally; only the display
 * label changes per tenant (one pool says "Board", another "HOA Committee").
 */
import type { RoleSlug } from "../types";
import { getRole, ROLE_LIST } from "../rbac/roles";
import type { Role } from "../types";
import type { TenantConfig } from "./schema";

/** Full display name for a role, honoring the tenant's label override. */
export function resolveRoleLabel(config: TenantConfig, slug: RoleSlug): string {
  return config.roleLabels[slug] ?? getRole(slug).name;
}

/** Short display name for a role (sidebar/badges), honoring the override. */
export function resolveRoleShortLabel(config: TenantConfig, slug: RoleSlug): string {
  return config.roleLabels[slug] ?? getRole(slug).shortName;
}

/** Is a role enabled for this tenant? super_admin (platform owner) is always allowed. */
export function isRoleActive(config: TenantConfig, slug: RoleSlug): boolean {
  return slug === "super_admin" || config.activeRoles.includes(slug);
}

/**
 * The tenant's assignable active roles as full Role objects, in hierarchy order.
 * Excludes super_admin — that's the platform owner, not a role a tenant assigns.
 */
export function activeRoleList(config: TenantConfig): Role[] {
  return ROLE_LIST.filter((r) => r.slug !== "super_admin" && config.activeRoles.includes(r.slug));
}
