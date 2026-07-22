"use client";

/**
 * Shared "who am I" resolver used by web (and mirrored by mobile) so both
 * surfaces resolve the SAME user, organization, role, and permissions from the
 * SAME Supabase project.
 *
 * - Demo mode: role comes from the session role-switcher on seeded data.
 * - Real mode: user/profile/membership come from Supabase; role from
 *   organization_members (falls back to org_admin during first-run setup).
 */
import { getBrowserSupabase, getEffectiveDataMode } from "@poolops/supabase";
import { resolvePermissions, type PermissionKey, type RoleSlug } from "@poolops/shared";
import { useSession } from "./session";

export interface UserContext {
  user: { id: string; email: string | null } | null;
  profile: { firstName: string | null; lastName: string | null } | null;
  organization: { id: string; name: string | null } | null;
  organizationMember: { roleSlug: RoleSlug } | null;
  role: RoleSlug | null;
  permissions: PermissionKey[];
  isDemoMode: boolean;
  dataMode: "mock" | "supabase";
}

/** Async resolver (real Supabase lookups when in supabase mode). */
export async function getCurrentUserContext(): Promise<UserContext> {
  const dataMode = getEffectiveDataMode();
  const session = useSession.getState();
  const isDemoMode = session.mode === "demo";

  // Demo mode (or mock): derive everything from the session role-switcher.
  if (isDemoMode || dataMode !== "supabase") {
    const role = session.role;
    return {
      user: session.email ? { id: "demo", email: session.email } : null,
      profile: null,
      organization: session.orgName ? { id: "demo", name: session.orgName } : { id: "org_tidetown", name: "Tide & Town Aquatics" },
      organizationMember: role ? { roleSlug: role } : null,
      role,
      permissions: role ? [...resolvePermissions(role)] : [],
      isDemoMode,
      dataMode,
    };
  }

  // Real mode: resolve from Supabase (graceful if schema not yet applied).
  const client = getBrowserSupabase();
  if (!client) return emptyContext(dataMode);
  const { data: userRes } = await client.auth.getUser();
  const authUser = userRes.user;
  if (!authUser) return emptyContext(dataMode);

  let role: RoleSlug = (session.role as RoleSlug) ?? "org_admin";
  let organization: UserContext["organization"] = session.orgName ? { id: "real", name: session.orgName } : null;
  let profile: UserContext["profile"] = null;

  try {
    const { data: member } = await client
      .from("organization_members").select("role_slug, organization_id").eq("profile_id", authUser.id).maybeSingle();
    if (member?.role_slug) role = member.role_slug as RoleSlug;
    if (member?.organization_id) {
      const { data: org } = await client.from("organizations").select("id, name").eq("id", member.organization_id).maybeSingle();
      if (org) organization = { id: org.id as string, name: (org.name as string) ?? null };
    }
    const { data: prof } = await client.from("profiles").select("first_name, last_name").eq("id", authUser.id).maybeSingle();
    if (prof) profile = { firstName: (prof.first_name as string) ?? null, lastName: (prof.last_name as string) ?? null };
  } catch {
    /* schema not applied — keep session defaults */
  }

  return {
    user: { id: authUser.id, email: authUser.email ?? null },
    profile,
    organization,
    organizationMember: { roleSlug: role },
    role,
    permissions: [...resolvePermissions(role)],
    isDemoMode: false,
    dataMode,
  };
}

function emptyContext(dataMode: "mock" | "supabase"): UserContext {
  return { user: null, profile: null, organization: null, organizationMember: null, role: null, permissions: [], isDemoMode: false, dataMode };
}
