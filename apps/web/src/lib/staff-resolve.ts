"use client";

/**
 * Resolve an actor id to a staff member / name. Reloaded rows store the actor as the
 * auth PROFILE id (auth.uid(), set by the insert-actor trigger), while the app
 * elsewhere uses staff_profiles.id — so a lookup must accept EITHER. Checks the
 * hydrated real roster (by staff id or linked profile id = userId) first, then falls
 * back to the seed roster for demo/mock.
 */
import { getStaff, type StaffProfile } from "@poolops/shared";
import { useDemo } from "@/lib/store";

export function useStaffResolver(): (id: string | null | undefined) => StaffProfile | undefined {
  const roster = useDemo((s) => s.staffRoster);
  return (id) => {
    if (!id) return undefined;
    return roster.find((s) => s.id === id || s.userId === id) ?? getStaff(id);
  };
}

export function useStaffName(): (id: string | null | undefined) => string {
  const resolve = useStaffResolver();
  return (id) => {
    const s = resolve(id);
    return s ? `${s.firstName} ${s.lastName}`.trim() : id ? "Team member" : "—";
  };
}
