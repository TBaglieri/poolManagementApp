import { NextResponse } from "next/server";
import { getServerSupabase } from "@poolops/supabase/server";
import { getAdminSupabase } from "@poolops/supabase/admin";
import { getTenantConfig, resolveAssignedRole, isAdminRole } from "@poolops/shared";

/**
 * POST /api/admin/set-role — change a user's role, or deactivate them. SERVER ONLY.
 *
 * Server-side enforcement of role changes (the UI RBAC is convenience only):
 *   • only an ADMIN of the caller's own org may change roles;
 *   • the target must be a member of the SAME org (tenant-scoped — no cross-tenant
 *     grants, and a user can never escalate their own role via a crafted request
 *     because a non-admin caller is rejected here);
 *   • the requested role is validated against the tenant's active roles and can
 *     never be super_admin (resolveAssignedRole → lowest privilege on a bad value);
 *   • the LAST remaining admin of a tenant cannot be demoted/deactivated;
 *   • every change is written to audit_logs (who, whom, from→to, when).
 * RLS reads membership live, so a demotion takes effect on the target's very next
 * request — a stale client session can't retain elevated server permissions.
 *
 * Body: { profileId: string, role?: string, deactivate?: boolean }
 */
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 }); }

  const profileId = (body?.profileId ?? "").toString();
  const deactivate = body?.deactivate === true;
  const requestedRole = body?.role != null ? String(body.role) : null;
  if (!profileId) return NextResponse.json({ ok: false, error: "profileId is required" }, { status: 400 });
  if (!deactivate && !requestedRole) return NextResponse.json({ ok: false, error: "role or deactivate is required" }, { status: 400 });

  const server = getServerSupabase();
  const admin = getAdminSupabase();
  if (!server || !admin) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });

  // 1) Caller must be signed in.
  const { data: userRes } = await server.auth.getUser();
  const caller = userRes.user;
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  // 2) Caller must be an ADMIN in an active membership — deny by default.
  const { data: callerMember, error: cmErr } = await server
    .from("organization_members").select("role_slug, organization_id")
    .eq("profile_id", caller.id).eq("status", "active").maybeSingle();
  if (cmErr) return NextResponse.json({ ok: false, error: "Could not verify your permissions." }, { status: 403 });
  const callerRole = (callerMember as any)?.role_slug as string | undefined;
  const orgId = (callerMember as any)?.organization_id as string | undefined;
  if (!orgId || !callerRole || !isAdminRole(callerRole as any)) {
    return NextResponse.json({ ok: false, error: "Only an admin can change roles." }, { status: 403 });
  }

  // 3) Target must be a member of the SAME org (tenant-scoped).
  const { data: target } = await admin
    .from("organization_members").select("id, role_slug, status")
    .eq("organization_id", orgId).eq("profile_id", profileId).maybeSingle();
  if (!target) return NextResponse.json({ ok: false, error: "That user isn't a member of your organization." }, { status: 404 });

  // 4) Validate the new role against the tenant's active roles (never super_admin).
  const { data: org } = await admin.from("organizations").select("slug").eq("id", orgId).maybeSingle();
  const config = getTenantConfig(((org as any)?.slug ?? "") || "default");
  const currentRole = (target as any).role_slug as string;
  const newRole = deactivate ? currentRole : resolveAssignedRole(config, requestedRole);
  const willBeAdminAfter = !deactivate && isAdminRole(newRole as any);

  // 5) Last-admin guard: block removing the tenant's final admin.
  const losingAdmin = isAdminRole(currentRole as any) && (deactivate || !willBeAdminAfter);
  if (losingAdmin) {
    const { count } = await admin
      .from("organization_members").select("id", { count: "exact", head: true })
      .eq("organization_id", orgId).eq("status", "active").in("role_slug", ["org_admin", "super_admin"]);
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ ok: false, error: "This is the last admin of the tenant — assign another admin first." }, { status: 409 });
    }
  }

  // 6) Apply.
  const patch = deactivate ? { status: "inactive" } : { role_slug: newRole, status: "active" };
  const { error: upErr } = await admin.from("organization_members").update(patch).eq("id", (target as any).id);
  if (upErr) return NextResponse.json({ ok: false, error: `Update failed: ${upErr.message}` }, { status: 500 });

  // Keep the staff_profiles roster row in step for role changes (best-effort).
  if (!deactivate) {
    await admin.from("staff_profiles").update({ primary_role: newRole, roles: [newRole] })
      .eq("organization_id", orgId).eq("profile_id", profileId);
  }

  // 7) Audit trail (best-effort — never blocks the change).
  await admin.from("audit_logs").insert({
    organization_id: orgId, actor_id: caller.id,
    action: deactivate ? "user_deactivated" : "role_changed", target: profileId,
    metadata: { from: currentRole, to: deactivate ? null : newRole, deactivated: deactivate },
  });

  return NextResponse.json({ ok: true, role: deactivate ? currentRole : newRole, deactivated: deactivate });
}
