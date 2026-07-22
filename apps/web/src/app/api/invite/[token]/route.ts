import { NextResponse } from "next/server";
import { getAdminSupabase } from "@poolops/supabase/admin";

/**
 * GET /api/invite/[token] — public, token-guarded invite lookup.
 *
 * Fixes the cross-device break: previously the accept page only read the invite
 * from the inviting browser's localStorage, so a guard opening the emailed link on
 * their own phone got "Invitation not found". This resolves the invite from the DB
 * by its unguessable token (service role, since anon RLS can't read others'
 * invites). Returns only the fields the accept screen needs — no secrets.
 */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

  const admin = getAdminSupabase();
  if (!admin) {
    // Mock mode / not configured: the client falls back to its local invite store.
    return NextResponse.json({ ok: false, error: "not-configured" }, { status: 503 });
  }

  const { data, error } = await admin
    .from("staff_invitations")
    .select("email, first_name, last_name, role_id, organization_id, home_facility_id, status, expires_at")
    .eq("invite_token", token)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: "lookup-failed" }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    invite: {
      email: (data as any).email,
      firstName: (data as any).first_name,
      lastName: (data as any).last_name,
      role: (data as any).role_id,
      organizationId: (data as any).organization_id,
      homeFacilityId: (data as any).home_facility_id,
      status: (data as any).status,
      expiresAt: (data as any).expires_at,
    },
  });
}
