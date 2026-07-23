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

/**
 * The LEAST-privileged active role for a tenant (lowest `level`). This is the safe
 * default whenever a role is missing, ambiguous, or fails to resolve — we must fall
 * back to the lowest privilege, NEVER escalate to admin. Falls back to "lifeguard"
 * (the base front-line role) if a tenant somehow has no active roles.
 */
export function lowestPrivilegeRole(config: TenantConfig): RoleSlug {
  const roles = activeRoleList(config);
  if (!roles.length) return "lifeguard";
  return roles.reduce((min, r) => (r.level < min.level ? r : min), roles[0]).slug;
}

/**
 * Resolve a REQUESTED role to an assignable one for this tenant. Returns the request
 * only if it's a real, active, non-super_admin role; otherwise the lowest-privilege
 * active role. Use everywhere a role is assigned so a bad/missing value can never
 * grant admin. `super_admin` is never assignable by a tenant.
 */
export function resolveAssignedRole(config: TenantConfig, requested?: string | null): RoleSlug {
  if (requested && requested !== "super_admin" && isRoleActive(config, requested as RoleSlug)) {
    return requested as RoleSlug;
  }
  return lowestPrivilegeRole(config);
}

/** True if a role is an org-level admin (can manage the tenant). */
export function isAdminRole(slug: RoleSlug): boolean {
  return slug === "super_admin" || slug === "org_admin";
}
