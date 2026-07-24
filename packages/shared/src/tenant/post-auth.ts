/**
 * Post-authentication destination — the SINGLE decision every login entry point
 * (root/main login, tenant login, or any future one) makes after a successful
 * sign-in. Given the user's ACTIVE organization memberships, it decides where they
 * go. Pure and framework-free so it is unit-testable and identical everywhere — see
 * AUDIT.md §6, where a root-login-only code path let a tenant user land in the
 * platform context.
 *
 * Rules (from the brief):
 *   • exactly one active tenant membership → enter that tenant, on the landing page
 *     the role can actually use (resolved against THAT tenant's config).
 *   • more than one active tenant membership → tenant picker.
 *   • no membership, not a platform account → "no access provisioned" (NEVER a
 *     silent fall-through into the platform context).
 *   • platform/PoolOps Pro account → platform context.
 */
import { getTenantConfig, isPlatformSlug } from "./registry";
import { resolveAssignedRole } from "./roles";
import { landingPathForRole } from "../rbac/nav";
import type { RoleSlug } from "../types";

/** One active membership as read from `organization_members` (+ resolved org slug). */
export interface MembershipInput {
  /** The org's tenant slug (e.g. "villas"), or null if it could not be resolved. */
  slug: string | null;
  orgName: string | null;
  /** `role_slug` on the membership row. */
  role: RoleSlug | null;
  /** True when this is a platform-owner membership (super_admin, or the platform org). */
  isPlatform?: boolean;
}

/** A tenant the user can enter, with the role-appropriate landing already resolved. */
export interface TenantChoice {
  slug: string;
  orgName: string | null;
  role: RoleSlug;
  /** Landing path within the tenant, e.g. "/dashboard" (admin) or "/schedule" (guard). */
  path: string;
}

export type PostAuthDestination =
  | ({ kind: "tenant" } & TenantChoice)
  | { kind: "picker"; memberships: TenantChoice[] }
  | { kind: "platform" }
  | { kind: "no-access" };

/** A membership is platform-level if flagged, a super_admin, or the reserved platform org. */
export function isPlatformMembership(m: MembershipInput): boolean {
  return m.isPlatform === true || m.role === "super_admin" || isPlatformSlug(m.slug);
}

/** Resolve a routable tenant membership into a concrete {slug, role, landing path}. */
function toChoice(m: MembershipInput & { slug: string }): TenantChoice {
  const config = getTenantConfig(m.slug);
  // Never escalate on a missing/foreign role — fall back to the tenant's lowest privilege.
  const role = resolveAssignedRole(config, m.role);
  return { slug: m.slug, orgName: m.orgName, role, path: landingPathForRole(role) };
}

export function postAuthDestination(memberships: MembershipInput[]): PostAuthDestination {
  const isPlatformAccount = memberships.some(isPlatformMembership);

  // Routable TENANT memberships: a resolvable slug that is a real tenant (not the
  // platform, not an unresolvable/orphan org). Orphans (slug === null) can't be
  // routed to and must not silently become a platform login.
  const tenants = memberships
    .filter((m): m is MembershipInput & { slug: string } =>
      !!m.slug && !isPlatformMembership(m))
    .map(toChoice);

  // De-dupe by slug (a user could hold two rows for the same org).
  const bySlug = new Map<string, TenantChoice>();
  for (const t of tenants) if (!bySlug.has(t.slug)) bySlug.set(t.slug, t);
  const unique = [...bySlug.values()];

  if (unique.length === 1) return { kind: "tenant", ...unique[0] };
  if (unique.length > 1) return { kind: "picker", memberships: unique };
  if (isPlatformAccount) return { kind: "platform" };
  return { kind: "no-access" };
}
