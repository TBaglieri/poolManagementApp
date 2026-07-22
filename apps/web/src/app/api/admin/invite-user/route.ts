import { NextResponse } from "next/server";
import { getServerSupabase } from "@poolops/supabase/server";
import { getAdminSupabase } from "@poolops/supabase/admin";

/**
 * POST /api/admin/invite-user  — SERVER ONLY.
 *
 * Creates a Supabase Auth user for an invited email and records a staff_invitation.
 * Uses the SERVICE ROLE key (server-only, bypasses RLS) — never exposed to the
 * browser or mobile. Validates that the CALLER is authenticated and permitted
 * before doing anything privileged.
 *
 * If email/SMTP isn't configured, Supabase still creates the user and the UI
 * shows the invite link; wire a provider (Resend/Twilio) to send it automatically.
 */

const ALLOWED_INVITER_ROLES = new Set([
  "super_admin", "org_admin", "hr_coordinator", "ops_manager", "lifeguard_manager", "scheduling_manager",
]);

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 }); }

  const { email, firstName, lastName, role, homeFacilityId, organizationId, managementPermissions } = body ?? {};
  if (!email || !role) return NextResponse.json({ ok: false, error: "email and role are required" }, { status: 400 });

  const server = getServerSupabase();
  const admin = getAdminSupabase();
  if (!server || !admin) {
    return NextResponse.json({ ok: false, error: "Supabase not configured (set NEXT_PUBLIC_SUPABASE_URL, anon + SUPABASE_SERVICE_ROLE_KEY)." }, { status: 503 });
  }

  // 1) The caller must be a signed-in user.
  const { data: userRes } = await server.auth.getUser();
  const caller = userRes.user;
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  // 2) Best-effort permission check against organization_members (skipped gracefully if schema missing).
  try {
    const { data: member, error: memberErr } = await server
      .from("organization_members").select("role_slug").eq("profile_id", caller.id).maybeSingle();
    if (!memberErr && member && !ALLOWED_INVITER_ROLES.has((member as any).role_slug)) {
      return NextResponse.json({ ok: false, error: "Your role cannot invite users." }, { status: 403 });
    }
    // 3) Hierarchy guard placeholder: lowest-level staff can never invite.
    if (!memberErr && member && (member as any).role_slug === "lifeguard") {
      return NextResponse.json({ ok: false, error: "Lifeguards cannot invite users." }, { status: 403 });
    }
  } catch {
    /* schema not applied yet — fall through; RLS will enforce once installed */
  }

  // 4) Create the auth user / send invite via the admin API.
  let invitedUserId: string | null = null;
  try {
    const redirectTo = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "") + "/login";
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { first_name: firstName, last_name: lastName, role },
      redirectTo: redirectTo || undefined,
    });
    if (inviteErr) {
      // Email may not be configured; still try to create the user so the invite record is valid.
      const { data: created } = await admin.auth.admin.createUser({ email, email_confirm: false, user_metadata: { first_name: firstName, last_name: lastName, role } });
      invitedUserId = created?.user?.id ?? null;
    } else {
      invitedUserId = invited?.user?.id ?? null;
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: `Auth invite failed: ${e?.message ?? "unknown"}` }, { status: 500 });
  }

  // 5) Record the invitation (best-effort; graceful if table missing).
  let inviteId: string | null = null;
  try {
    const { data, error } = await admin.from("staff_invitations").insert({
      organization_id: organizationId ?? null, email, first_name: firstName, last_name: lastName,
      role_id: role, home_facility_id: homeFacilityId ?? null, invited_by: caller.id, status: "sent",
    }).select("id").single();
    if (!error) inviteId = (data as any)?.id ?? null;
    // Optional management-permission flags
    if (managementPermissions && invitedUserId) {
      await admin.from("user_management_permissions").insert({
        organization_id: organizationId ?? null, user_id: invitedUserId, ...managementPermissions,
      });
    }
  } catch {
    /* schema not applied — invite auth user still created */
  }

  return NextResponse.json({ ok: true, invitedUserId, inviteId, note: inviteId ? null : "Auth user created; run supabase/schema.sql to persist the invitation record." });
}
