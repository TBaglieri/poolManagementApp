"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase, getEffectiveDataMode } from "@poolops/supabase";
import { staff as seedStaff, type RoleSlug } from "@poolops/shared";

/** A person with access to the tenant (a real Supabase org member, or a demo staff). */
export interface OrgMember {
  /** The auth profile id — the id role/deactivate/reset actions act on. */
  profileId: string;
  firstName: string;
  lastName: string;
  email: string;
  roleSlug: RoleSlug;
  status: string;
  avatarColor?: string;
}

/**
 * The tenant's real members from Supabase (RLS-scoped to the caller's org) so Users
 * & Access manages ACTUAL people, not demo staff. In mock/demo mode it returns the
 * seeded roster so the demo tenant still looks populated. `reload()` re-fetches after
 * a change (role/deactivate).
 */
export function useOrgMembers(): { members: OrgMember[]; loading: boolean; live: boolean; reload: () => void } {
  const live = getEffectiveDataMode() === "supabase";
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(live);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let active = true;
    if (!live) {
      setMembers(seedStaff.map((s) => ({
        profileId: s.id, firstName: s.firstName, lastName: s.lastName, email: s.email,
        roleSlug: s.primaryRole, status: "active", avatarColor: s.avatarColor,
      })));
      setLoading(false);
      return;
    }
    const client = getBrowserSupabase();
    if (!client) { setMembers([]); setLoading(false); return; }
    setLoading(true);
    (async () => {
      const { data } = await client
        .from("organization_members")
        .select("profile_id, role_slug, status, profiles(first_name, last_name, email, avatar_color)");
      if (!active) return;
      const rows: OrgMember[] = (data ?? []).map((m: any) => ({
        profileId: m.profile_id,
        roleSlug: (m.role_slug ?? "lifeguard") as RoleSlug,
        status: m.status ?? "active",
        firstName: m.profiles?.first_name ?? "",
        lastName: m.profiles?.last_name ?? "",
        email: m.profiles?.email ?? "",
        avatarColor: m.profiles?.avatar_color ?? undefined,
      }));
      setMembers(rows);
      setLoading(false);
    })().catch(() => { if (active) { setMembers([]); setLoading(false); } });
    return () => { active = false; };
  }, [live, tick]);

  return { members, loading, live, reload };
}
