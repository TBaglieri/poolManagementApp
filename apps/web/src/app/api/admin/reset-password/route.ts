import { NextResponse } from "next/server";
import { getServerSupabase } from "@poolops/supabase/server";
import { getAdminSupabase } from "@poolops/supabase/admin";
import { isAdminRole, normalizeEmail } from "@poolops/shared";

/**
 * POST /api/admin/reset-password — admin triggers a password reset for a member of
 * their OWN org. SERVER ONLY. Because email/SMTP may not be configured, this returns
 * a copyable recovery **action link** the admin can send manually (the reliable path).
 *
 * Guards: caller must be an admin; the target email must belong to an active member
 * of the caller's org (tenant-scoped — an admin can't mint reset links for arbitrary
 * accounts or other tenants). No password is ever set or revealed here.
 *
 * Body: { email: string }
 */
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 }); }
  const email = normalizeEmail(body?.email);
  if (!email) return NextResponse.json({ ok: false, error: "email is required" }, { status: 400 });

  const server = getServerSupabase();
  const admin = getAdminSupabase();
  if (!server || !admin) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });

  const { data: userRes } = await server.auth.getUser();
  const caller = userRes.user;
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  const { data: callerMember } = await server
    .from("organization_members").select("role_slug, organization_id")
    .eq("profile_id", caller.id).eq("status", "active").maybeSingle();
  const callerRole = (callerMember as any)?.role_slug as string | undefined;
  const orgId = (callerMember as any)?.organization_id as string | undefined;
  if (!orgId || !callerRole || !isAdminRole(callerRole as any)) {
    return NextResponse.json({ ok: false, error: "Only an admin can reset passwords." }, { status: 403 });
  }

  // Target must be a member of the caller's org (tenant-scoped).
  const { data: prof } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  const targetId = (prof as any)?.id as string | undefined;
  if (targetId) {
    const { data: member } = await admin.from("organization_members")
      .select("id").eq("organization_id", orgId).eq("profile_id", targetId).maybeSingle();
    if (!member) return NextResponse.json({ ok: false, error: "That user isn't a member of your organization." }, { status: 404 });
  } else {
    return NextResponse.json({ ok: false, error: "No account found for that email in your organization." }, { status: 404 });
  }

  // Where the emailed/copied link should land (this tenant's reset page).
  const { data: org } = await admin.from("organizations").select("slug").eq("id", orgId).maybeSingle();
  const slug = (org as any)?.slug as string | undefined;
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const redirectTo = `${base}${slug ? `/${slug}` : ""}/reset-password`;

  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
  if (error) return NextResponse.json({ ok: false, error: `Couldn't create a reset link: ${error.message}` }, { status: 500 });

  const link = (data as any)?.properties?.action_link ?? null;
  return NextResponse.json({
    ok: true,
    link,
    note: "Email delivery depends on your Supabase SMTP config. Copy this link and send it to the user if they didn't receive an email.",
  });
}
