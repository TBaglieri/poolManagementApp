"use client";

import { useEffect } from "react";
import { getBrowserSupabase, getEffectiveDataMode } from "@poolops/supabase";
import { isDemoTenant } from "@poolops/shared";
import { useTenantConfig } from "@/lib/tenant/provider";
import { useSession } from "@/lib/session";
import { resolveUserTenant } from "@/lib/tenant/user-tenant";

/**
 * Bridges the REAL Supabase auth session into the app's session store — the piece
 * that was missing (see AUDIT.md §4g). Without it, `useSession` (persisted in
 * localStorage) was the only "current user", so a stale demo identity (e.g. the
 * seeded "Marcus Reyes") kept rendering even with a valid real session.
 *
 * On a real tenant in supabase mode it makes the Supabase session the source of
 * truth:
 *   • a signed-in user → establish/refresh the real session from their profile;
 *   • no session → clear any (stale) identity so the shell redirects to login,
 *     never a demo user.
 * The demo tenant and no-backend (mock) builds skip this — the demo experience and
 * the login form drive the store directly there.
 */
export function SupabaseSessionSync() {
  const config = useTenantConfig();
  const demoTenant = isDemoTenant(config);

  useEffect(() => {
    // Nothing to reconcile against: let the shell proceed with existing rules.
    if (demoTenant || getEffectiveDataMode() !== "supabase") { useSession.getState().markAuthResolved(); return; }
    const client = getBrowserSupabase();
    if (!client) { useSession.getState().markAuthResolved(); return; }

    let active = true;
    const reconcile = async (user: { id: string; email?: string | null } | null) => {
      if (!active) return;
      const st = useSession.getState();
      if (user?.id) {
        const sameUser = st.mode === "real" && !!st.email && st.email.toLowerCase() === (user.email ?? "").toLowerCase();
        if (sameUser) { st.markAuthResolved(); return; }
        const ut = await resolveUserTenant(user.id);
        if (!active) return;
        useSession.getState().applyRealSession({
          email: user.email ?? "",
          role: ut.role ?? "org_admin",
          userName: ut.firstName ?? (user.email ? user.email.split("@")[0] : ""),
          staffProfileId: ut.staffId,
          staffLinked: ut.staffLinked === true,
          orgName: ut.orgName ?? undefined,
          plan: "small",
        });
      } else {
        // No real session → drop any persisted identity (real tenants never show a demo user).
        useSession.getState().invalidateSession();
      }
    };

    client.auth.getUser()
      .then(({ data }) => reconcile(data.user))
      .catch(() => useSession.getState().markAuthResolved());
    const { data: sub } = client.auth.onAuthStateChange((_e, session) => { void reconcile(session?.user ?? null); });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [demoTenant]);

  return null;
}
