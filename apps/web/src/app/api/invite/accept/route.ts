import { NextResponse } from "next/server";
import { getAdminSupabase } from "@poolops/supabase/admin";
import { normalizeEmail } from "@poolops/shared";
import { linkStaffProfile } from "@/lib/server/staff-provisioning";

/**
 * POST /api/invite/accept  — SERVER ONLY (service role).
 *
 * Called right after a guard sets their password on the accept-invite page. Turns
 * their fresh auth account into a fully provisioned, LINKED staff member:
 *   1) resolves the invitation by token,
 *   2) verifies the auth user's email matches the invited email (a guard can only
 *      claim the invite that was actually sent to them — cross-tenant/foreign
 *      claims are rejected),
 *   3) upserts org membership + sets profile.organization_id,
 *   4) LINKS their staff_profiles row (writes profile_id) so current_staff_id()
 *      resolves — My Shifts, clock-in and per-person attribution work at once,
 *   5) marks the invitation accepted.
 *
 * Everything is scoped to the invitation's organization_id, so acceptance can
 * never provision the user into another tenant.
 */
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 }); }

  const token = (body?.token ?? "").toString();
  const userId = (body?.userId ?? "").toString();
  if (!token || !userId) return NextResponse.json({ ok: false, error: "token and userId are required" }, { status: 400 });

  const admin = getAdminSupabase();
  if (!admin) return NextResponse.json({ ok: false, error: "not-configured" }, { status: 503 });

  // 1) Resolve the invitation.
  const { data: invite, error: invErr } = await admin
    .from("staff_invitations")
    .select("email, first_name, last_name, role_id, organization_id, home_facility_id, status")
    .eq("invite_token", token).maybeSingle();
  if (invErr) return NextResponse.json({ ok: false, error: "lookup-failed" }, { status: 500 });
  if (!invite) return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });

  const inv = invite as any;
  const orgId = inv.organization_id as string | null;
  if (!orgId) return NextResponse.json({ ok: false, error: "invite has no organization" }, { status: 422 });

  // 2) Verify the accepting user IS the invited person (email must match).
  const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(userId);
  if (userErr || !userRes?.user) return NextResponse.json({ ok: false, error: "unknown user" }, { status: 404 });
  if (normalizeEmail(userRes.user.email) !== normalizeEmail(inv.email)) {
    return NextResponse.json({ ok: false, error: "This invitation was issued to a different email." }, { status: 403 });
  }

  // 3) Org membership + profile org (idempotent).
  const { error: memErr } = await admin.from("organization_members").upsert(
    { organization_id: orgId, profile_id: userId, role_slug: inv.role_id ?? "lifeguard", status: "active" },
    { onConflict: "organization_id,profile_id" },
  );
  if (memErr) return NextResponse.json({ ok: false, error: `membership failed: ${memErr.message}` }, { status: 500 });
  await admin.from("profiles").update({
    organization_id: orgId, first_name: inv.first_name ?? null, last_name: inv.last_name ?? null,
  }).eq("id", userId);

  // 4) Link (or create) the staff profile.
  const linked = await linkStaffProfile(admin, {
    organizationId: orgId, profileId: userId, email: inv.email,
    firstName: inv.first_name, lastName: inv.last_name, role: inv.role_id, homeFacilityId: inv.home_facility_id,
  });
  if (!linked.ok) return NextResponse.json({ ok: false, error: `staff link failed: ${linked.error}` }, { status: 500 });

  // 5) Mark the invitation accepted (best-effort).
  await admin.from("staff_invitations").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("invite_token", token);

  return NextResponse.json({ ok: true, organizationId: orgId, staffId: linked.staffId });
}
