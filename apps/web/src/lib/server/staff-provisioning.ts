/**
 * SERVER-ONLY staff provisioning (uses the service-role admin client; never import
 * from client components). Establishes the auth→staff link at onboarding time:
 *
 *   • reserveStaffProfile   — at INVITE time, create a staff_profiles row with the
 *                             invitee's email but no profile_id yet (RESERVED).
 *   • linkStaffProfile      — at ACCEPT time (or backfill), write the guard's auth
 *                             id onto their reserved row, or create a linked row if
 *                             none was reserved.
 *
 * Both are idempotent and tenant-scoped: every query is filtered by
 * organization_id, so a caller can never touch another tenant's staff rows. The
 * unique index on (organization_id, profile_id) guarantees at most one linked row
 * per auth account per tenant, even under a race.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail, type RoleSlug } from "@poolops/shared";

type Admin = SupabaseClient<any, any, any>;

export interface ReserveInput {
  organizationId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: RoleSlug | string | null;
  homeFacilityId?: string | null;
}

export interface ProvisionResult {
  ok: boolean;
  staffId: string | null;
  /** True when a brand-new row was inserted (vs. an existing one reused/linked). */
  created: boolean;
  error: string | null;
}

function rolePair(role?: string | null): { primary_role: string; roles: string[] } {
  const r = role || "lifeguard";
  return { primary_role: r, roles: [r] };
}

/**
 * Reserve a staff row for an invitee (profile_id NULL). Idempotent per (org, email):
 * if a row already exists for that email — reserved or already linked — it's returned
 * unchanged so re-inviting never duplicates a person.
 */
export async function reserveStaffProfile(admin: Admin, input: ReserveInput): Promise<ProvisionResult> {
  const email = normalizeEmail(input.email);
  if (!input.organizationId || !email) return { ok: false, staffId: null, created: false, error: "organizationId and email are required" };

  const { data: existing, error: selErr } = await admin
    .from("staff_profiles").select("id")
    .eq("organization_id", input.organizationId).eq("email", email).limit(1).maybeSingle();
  if (selErr) return { ok: false, staffId: null, created: false, error: selErr.message };
  if (existing) return { ok: true, staffId: (existing as any).id, created: false, error: null };

  const { data, error } = await admin.from("staff_profiles").insert({
    organization_id: input.organizationId, profile_id: null, email,
    first_name: input.firstName ?? null, last_name: input.lastName ?? null,
    ...rolePair(input.role), title: null, home_facility_id: input.homeFacilityId ?? null,
    employment_status: "invited",
  }).select("id").single();
  if (error) return { ok: false, staffId: null, created: false, error: error.message };
  return { ok: true, staffId: (data as any).id, created: true, error: null };
}

export interface LinkInput extends ReserveInput {
  /** The guard's auth user id (== profiles.id) to write onto their staff row. */
  profileId: string;
}

/**
 * Link a guard's auth id to their staff row. Handles BOTH orderings safely:
 *   - a RESERVED row for their email exists → write profile_id onto it (activate);
 *   - no reserved row (e.g. profile created at first login) → create a linked row.
 * Idempotent: if they're already linked, it's a no-op.
 */
export async function linkStaffProfile(admin: Admin, input: LinkInput): Promise<ProvisionResult> {
  const email = normalizeEmail(input.email);
  if (!input.organizationId || !input.profileId) return { ok: false, staffId: null, created: false, error: "organizationId and profileId are required" };

  // Already linked to this auth user in this org? (idempotent)
  const { data: linked, error: linkedErr } = await admin
    .from("staff_profiles").select("id")
    .eq("organization_id", input.organizationId).eq("profile_id", input.profileId).limit(1).maybeSingle();
  if (linkedErr) return { ok: false, staffId: null, created: false, error: linkedErr.message };
  if (linked) return { ok: true, staffId: (linked as any).id, created: false, error: null };

  // Claim a reserved row by email.
  if (email) {
    const { data: reserved } = await admin
      .from("staff_profiles").select("id")
      .eq("organization_id", input.organizationId).eq("email", email).is("profile_id", null).limit(1).maybeSingle();
    if (reserved) {
      const { error } = await admin.from("staff_profiles")
        .update({ profile_id: input.profileId, employment_status: "active" }).eq("id", (reserved as any).id);
      if (error) return { ok: false, staffId: null, created: false, error: error.message };
      return { ok: true, staffId: (reserved as any).id, created: false, error: null };
    }
  }

  // No reserved row — create a linked one.
  const { data, error } = await admin.from("staff_profiles").insert({
    organization_id: input.organizationId, profile_id: input.profileId, email: email || null,
    first_name: input.firstName ?? null, last_name: input.lastName ?? null,
    ...rolePair(input.role), home_facility_id: input.homeFacilityId ?? null, employment_status: "active",
  }).select("id").single();
  if (error) return { ok: false, staffId: null, created: false, error: error.message };
  return { ok: true, staffId: (data as any).id, created: true, error: null };
}
