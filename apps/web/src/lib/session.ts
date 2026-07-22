"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEMO_STAFF_BY_ROLE, getStaff, type ID, type RoleSlug } from "@poolops/shared";
import { signOut as supabaseSignOut } from "./auth";

const ORG_WIDE: RoleSlug[] = ["super_admin", "org_admin", "scheduling_manager", "payroll_team", "hr_coordinator"];

/** "demo" = seeded preview with role switcher; "real" = authenticated customer org. */
export type SessionMode = "demo" | "real";

interface SessionState {
  role: RoleSlug | null;
  staffId: ID | null;
  facilityId: ID | "all";
  email: string | null;
  /** Real signed-in user's display name (from their profile). Null in demo mode. */
  userName: string | null;
  /** The real user's linked staff_profiles.id (null in demo, or if unlinked). */
  staffProfileId: ID | null;
  /**
   * Whether the real user resolved to a staff row. `null` = not yet resolved,
   * `true` = linked, `false` = signed in but has NO staff profile (fail loudly).
   */
  staffLinked: boolean | null;
  mode: SessionMode;
  /** Set once a real user finishes org setup (drives setup redirect). */
  hasOrganization: boolean;
  orgName: string | null;
  plan: string | null;
  hydrated: boolean;
  /**
   * Whether the Supabase auth session has been checked for this load (real tenants
   * in supabase mode). Until true, the shell waits instead of trusting a persisted
   * (possibly stale demo) session. NOT persisted — re-checked every load.
   */
  authResolved: boolean;

  /** Enter DEMO mode as a role (role switcher / "Continue as demo X"). */
  enterDemo: (role: RoleSlug) => void;
  /** @deprecated alias of enterDemo, kept for existing callers. */
  loginAs: (role: RoleSlug) => void;
  /** Switch role while in demo mode. */
  setRole: (role: RoleSlug) => void;
  /** Establish a REAL authenticated session (Supabase user). */
  loginReal: (email: string, role: RoleSlug, hasOrganization: boolean) => void;
  /** Establish a REAL session in one shot from a reconciled Supabase user. */
  applyRealSession: (p: {
    email: string; role: RoleSlug; userName?: string | null;
    staffProfileId?: ID | null; staffLinked?: boolean | null; orgName?: string | null; plan?: string | null;
  }) => void;
  /** Mark the auth-session check complete (nothing to reconcile / done). */
  markAuthResolved: () => void;
  /** Clear identity because there is no valid real session (redirects to login). */
  invalidateSession: () => void;
  setHasOrganization: (v: boolean) => void;
  setRealOrg: (name: string, plan: string) => void;
  setFacility: (id: ID | "all") => void;
  setEmail: (email: string | null) => void;
  /** Set the real user's display name (from their profile). */
  setUserName: (name: string | null) => void;
  /** Record the resolved staff link for the real user (id + whether it resolved). */
  setStaffLink: (staffProfileId: ID | null, linked: boolean) => void;
  /** Leave demo mode and return to the landing/login. */
  exitDemo: () => void;
  logout: () => void;
  _setHydrated: () => void;
}

function facilityForRole(role: RoleSlug): ID | "all" {
  if (ORG_WIDE.includes(role)) return "all";
  const staff = getStaff(DEMO_STAFF_BY_ROLE[role]);
  return staff?.homeFacilityId ?? "all";
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      role: null,
      staffId: null,
      facilityId: "all",
      email: null,
      userName: null,
      staffProfileId: null,
      staffLinked: null,
      mode: "demo",
      hasOrganization: false,
      orgName: null,
      plan: null,
      hydrated: false,
      authResolved: false,

      enterDemo: (role) =>
        set({ role, staffId: DEMO_STAFF_BY_ROLE[role], facilityId: facilityForRole(role), mode: "demo", email: null, userName: null, staffProfileId: null, staffLinked: null, hasOrganization: true, authResolved: true }),
      loginAs: (role) =>
        set({ role, staffId: DEMO_STAFF_BY_ROLE[role], facilityId: facilityForRole(role), mode: "demo", hasOrganization: true, authResolved: true }),
      setRole: (role) =>
        set({ role, staffId: DEMO_STAFF_BY_ROLE[role], facilityId: facilityForRole(role) }),
      loginReal: (email, role, hasOrganization) =>
        set({ email, role, staffId: null, facilityId: "all", mode: "real", hasOrganization, staffProfileId: null, staffLinked: null, authResolved: true }),
      applyRealSession: ({ email, role, userName, staffProfileId, staffLinked, orgName, plan }) =>
        set({
          email, role, staffId: null, facilityId: "all", mode: "real", hasOrganization: true,
          userName: userName ?? null, staffProfileId: staffProfileId ?? null, staffLinked: staffLinked ?? null,
          orgName: orgName ?? null, plan: plan ?? null, authResolved: true,
        }),
      markAuthResolved: () => set({ authResolved: true }),
      invalidateSession: () =>
        set({ role: null, staffId: null, facilityId: "all", email: null, userName: null, staffProfileId: null, staffLinked: null, mode: "demo", hasOrganization: false, orgName: null, plan: null, authResolved: true }),
      setHasOrganization: (v) => set({ hasOrganization: v }),
      setRealOrg: (orgName, plan) => set({ orgName, plan, hasOrganization: true }),
      setFacility: (facilityId) => set({ facilityId }),
      setEmail: (email) => set({ email }),
      setUserName: (userName) => set({ userName }),
      setStaffLink: (staffProfileId, linked) => set({ staffProfileId, staffLinked: linked }),
      exitDemo: () => {
        void supabaseSignOut();
        set({ role: null, staffId: null, facilityId: "all", email: null, userName: null, staffProfileId: null, staffLinked: null, mode: "demo", hasOrganization: false, orgName: null, plan: null, authResolved: true });
      },
      logout: () => {
        void supabaseSignOut();
        set({ role: null, staffId: null, facilityId: "all", email: null, userName: null, staffProfileId: null, staffLinked: null, mode: "demo", hasOrganization: false, orgName: null, plan: null, authResolved: true });
      },
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "poolops-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ role: s.role, staffId: s.staffId, facilityId: s.facilityId, email: s.email, userName: s.userName, staffProfileId: s.staffProfileId, staffLinked: s.staffLinked, mode: s.mode, hasOrganization: s.hasOrganization, orgName: s.orgName, plan: s.plan }),
      onRehydrateStorage: () => (state) => state?._setHydrated(),
    },
  ),
);
