"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEMO_STAFF_BY_ROLE, getStaff, type ID, type RoleSlug } from "@poolops/shared";

const ORG_WIDE: RoleSlug[] = ["super_admin", "org_admin", "scheduling_manager", "payroll_team", "hr_coordinator"];

interface SessionState {
  role: RoleSlug | null;
  staffId: ID | null;
  facilityId: ID | "all";
  hydrated: boolean;
  loginAs: (role: RoleSlug) => void;
  setRole: (role: RoleSlug) => void;
  setFacility: (id: ID | "all") => void;
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
      hydrated: false,
      loginAs: (role) =>
        set({ role, staffId: DEMO_STAFF_BY_ROLE[role], facilityId: facilityForRole(role) }),
      setRole: (role) =>
        set({ role, staffId: DEMO_STAFF_BY_ROLE[role], facilityId: facilityForRole(role) }),
      setFacility: (facilityId) => set({ facilityId }),
      logout: () => set({ role: null, staffId: null, facilityId: "all" }),
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "poolops-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ role: s.role, staffId: s.staffId, facilityId: s.facilityId }),
      onRehydrateStorage: () => (state) => state?._setHydrated(),
    },
  ),
);
