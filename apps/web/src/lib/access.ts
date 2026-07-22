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
  const staffProfileId = useSession((s) => s.staffProfileId);
  const staffLinked = useSession((s) => s.staffLinked);
  const staff = getStaff(staffId);
  const overrides = staff?.permissionOverrides ?? [];

  return {
    role,
    roleMeta: role ? getRole(role) : null,
    staff,
    staffId,
    /** The real signed-in user's linked staff_profiles.id (null in demo/unlinked). */
    staffProfileId,
    staffLinked,
    facilityId,
    mode,
    isDemo: mode === "demo",
    email,
    can: (p: PermissionKey) => (role ? canFn(role, p, overrides) : false),
    canAny: (ps: PermissionKey[]) => (role ? canAnyFn(role, ps, overrides) : false),
  };
}

/**
 * The id a user acts AS for self-service features (My Shifts, clock-in, per-person
 * attribution): the real linked staff_profiles.id in real mode, the demo staff id
 * in demo mode. Null in real mode when the account has no linked staff profile.
 */
export function useMyStaffId(): string | null {
  const mode = useSession((s) => s.mode);
  const staffProfileId = useSession((s) => s.staffProfileId);
  const staffId = useSession((s) => s.staffId);
  return mode === "real" ? staffProfileId : staffId;
}

export type StaffProfileState = "ok" | "unlinked" | "demo";

/** Pure form of the staff-link check (unit-testable). */
export function staffProfileState(mode: "demo" | "real", staffProfileId: string | null, staffLinked: boolean | null): StaffProfileState {
  if (mode !== "real") return "demo";
  return staffProfileId || staffLinked === true ? "ok" : "unlinked";
}

/**
 * Whether the current user can act as a staff member on self-service screens.
 * `"unlinked"` means: signed in, but no staff_profiles row — fail loudly instead
 * of silently showing empty/incorrect data.
 */
export function useStaffProfileState(): StaffProfileState {
  const mode = useSession((s) => s.mode);
  const staffProfileId = useSession((s) => s.staffProfileId);
  const staffLinked = useSession((s) => s.staffLinked);
  return staffProfileState(mode, staffProfileId, staffLinked);
}

/** Read hydration state to avoid SSR/client mismatches before persist loads. */
export function useHydrated(): boolean {
  return useSession((s) => s.hydrated);
}

/**
 * The current user's first-name/label for greetings — real profile name in real
 * mode (never a demo staff identity), demo staff first name in demo mode.
 */
export function useDisplayName(): string {
  const mode = useSession((s) => s.mode);
  const userName = useSession((s) => s.userName);
  const email = useSession((s) => s.email);
  const staffId = useSession((s) => s.staffId);
  if (mode === "real") return userName || (email ? email.split("@")[0] : "") || "there";
  return getStaff(staffId)?.firstName ?? "there";
}
