"use client";

import {
  can as canFn, canAny as canAnyFn, getRole, getStaff,
  type PermissionKey, type RoleSlug,
} from "@poolops/shared";
import { useSession } from "./session";

/** Permission-aware view of the current demo session. */
export function useAccess() {
  const role = useSession((s) => s.role);
  const staffId = useSession((s) => s.staffId);
  const facilityId = useSession((s) => s.facilityId);
  const mode = useSession((s) => s.mode);
  const email = useSession((s) => s.email);
  const staff = getStaff(staffId);
  const overrides = staff?.permissionOverrides ?? [];

  return {
    role,
    roleMeta: role ? getRole(role) : null,
    staff,
    staffId,
    facilityId,
    mode,
    isDemo: mode === "demo",
    email,
    can: (p: PermissionKey) => (role ? canFn(role, p, overrides) : false),
    canAny: (ps: PermissionKey[]) => (role ? canAnyFn(role, ps, overrides) : false),
  };
}

/** Read hydration state to avoid SSR/client mismatches before persist loads. */
export function useHydrated(): boolean {
  return useSession((s) => s.hydrated);
}
