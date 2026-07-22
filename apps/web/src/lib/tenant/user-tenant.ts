"use client";

/**
 * Resolve which tenant a signed-in user belongs to, so login can drop them
 * straight into their tenant (e.g. /villas/dashboard) without them ever typing a
 * slug. Reads their active organization membership from Supabase; maps the org to
 * a tenant slug (the org's `slug` column, or the display name → registry fallback
 * when tenant-config.sql hasn't been applied).
 */
import { getBrowserSupabase } from "@poolops/supabase";
import { KNOWN_TENANT_SLUGS, getTenantConfig, type RoleSlug } from "@poolops/shared";

export interface ResolvedUserTenant {
  slug: string | null;
  orgName: string | null;
  role: RoleSlug | null;
  firstName: string | null;
  /** The user's linked staff_profiles.id in this org, or null if not linked. */
  staffId: string | null;
  /**
   * Whether we could resolve a staff row. `true` = linked; `false` = the user has
   * an org membership but NO staff profile (fail loudly — see AUDIT.md §4e). Null
   * when there was no membership/org to resolve against.
   */
  staffLinked: boolean | null;
}

/** Map an org display name back to a registry tenant slug (fallback when no slug column). */
function slugForOrgName(name: string | null): string | null {
  if (!name) return null;
  const lower = name.trim().toLowerCase();
  for (const slug of KNOWN_TENANT_SLUGS) {
    if (getTenantConfig(slug).displayName.toLowerCase() === lower) return slug;
  }
  return null;
}

export async function resolveUserTenant(userId: string): Promise<ResolvedUserTenant> {
  const out: ResolvedUserTenant = { slug: null, orgName: null, role: null, firstName: null, staffId: null, staffLinked: null };
  const client = getBrowserSupabase();
  if (!client) return out;

  try {
    const { data: member } = await client
      .from("organization_members")
      .select("role_slug, organization_id")
      .eq("profile_id", userId).eq("status", "active").limit(1).maybeSingle();
    if (member?.role_slug) out.role = member.role_slug as RoleSlug;

    if (member?.organization_id) {
      // Resolve the user's staff row in THIS org (their acting identity). A member
      // with no staff row is "unlinked" — surfaced so the app can fail loudly.
      const { data: staff } = await client
        .from("staff_profiles").select("id")
        .eq("profile_id", userId).eq("organization_id", member.organization_id).limit(1).maybeSingle();
      out.staffId = (staff as any)?.id ?? null;
      out.staffLinked = !!out.staffId;

      // Prefer the org's slug column; fall back to mapping the display name.
      const withSlug = await client.from("organizations").select("name, slug").eq("id", member.organization_id).maybeSingle();
      if (!withSlug.error && withSlug.data) {
        out.orgName = (withSlug.data as any).name ?? null;
        out.slug = (withSlug.data as any).slug ?? slugForOrgName(out.orgName);
      } else {
        const byName = await client.from("organizations").select("name").eq("id", member.organization_id).maybeSingle();
        out.orgName = (byName.data as any)?.name ?? null;
        out.slug = slugForOrgName(out.orgName);
      }
    }

    const { data: prof } = await client.from("profiles").select("first_name").eq("id", userId).maybeSingle();
    out.firstName = (prof as any)?.first_name ?? null;
  } catch {
    /* graceful — return whatever resolved */
  }
  return out;
}
