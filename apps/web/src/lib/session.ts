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
  mode: SessionMode;
  /** Set once a real user finishes org setup (drives setup redirect). */
  hasOrganization: boolean;
  orgName: string | null;
  plan: string | null;
  hydrated: boolean;

  /** Enter DEMO mode as a role (role switcher / "Continue as demo X"). */
  enterDemo: (role: RoleSlug) => void;
  /** @deprecated alias of enterDemo, kept for existing callers. */
  loginAs: (role: RoleSlug) => void;
  /** Switch role while in demo mode. */
  setRole: (role: RoleSlug) => void;
  /** Establish a REAL authenticated session (Supabase user). */
  loginReal: (email: string, role: RoleSlug, hasOrganization: boolean) => void;
  setHasOrganization: (v: boolean) => void;
  setRealOrg: (name: string, plan: string) => void;
  setFacility: (id: ID | "all") => void;
  setEmail: (email: string | null) => void;
  /** Set the real user's display name (from their profile). */
  setUserName: (name: string | null) => void;
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
      mode: "demo",
      hasOrganization: false,
      orgName: null,
      plan: null,
      hydrated: false,

      enterDemo: (role) =>
        set({ role, staffId: DEMO_STAFF_BY_ROLE[role], facilityId: facilityForRole(role), mode: "demo", email: null, userName: null, hasOrganization: true }),
      loginAs: (role) =>
        set({ role, staffId: DEMO_STAFF_BY_ROLE[role], facilityId: facilityForRole(role), mode: "demo", hasOrganization: true }),
      setRole: (role) =>
        set({ role, staffId: DEMO_STAFF_BY_ROLE[role], facilityId: facilityForRole(role) }),
      loginReal: (email, role, hasOrganization) =>
        set({ email, role, staffId: null, facilityId: "all", mode: "real", hasOrganization }),
      setHasOrganization: (v) => set({ hasOrganization: v }),
      setRealOrg: (orgName, plan) => set({ orgName, plan, hasOrganization: true }),
      setFacility: (facilityId) => set({ facilityId }),
      setEmail: (email) => set({ email }),
      setUserName: (userName) => set({ userName }),
      exitDemo: () => {
        void supabaseSignOut();
        set({ role: null, staffId: null, facilityId: "all", email: null, userName: null, mode: "demo", hasOrganization: false, orgName: null, plan: null });
      },
      logout: () => {
        void supabaseSignOut();
        set({ role: null, staffId: null, facilityId: "all", email: null, userName: null, mode: "demo", hasOrganization: false, orgName: null, plan: null });
      },
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "poolops-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ role: s.role, staffId: s.staffId, facilityId: s.facilityId, email: s.email, userName: s.userName, mode: s.mode, hasOrganization: s.hasOrganization, orgName: s.orgName, plan: s.plan }),
      onRehydrateStorage: () => (state) => state?._setHydrated(),
    },
  ),
);
