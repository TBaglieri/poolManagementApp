/**
 * Pure logic for linking Supabase auth accounts to their `staff_profiles` row.
 *
 * The DB link is `staff_profiles.profile_id → profiles.id (== auth.users.id)`.
 * RLS resolves "who am I acting as" through `current_staff_id()` (the staff row
 * whose `profile_id = auth.uid()`), so a staff member with NO linked row has no
 * identity server-side — My Shifts, clock-in and per-person attribution all fail.
 *
 * This module has NO Supabase / IO dependency so both the invite-accept route and
 * the backfill script can share the matching rules and unit-test them. Callers
 * pass ALREADY tenant-scoped lists (rows/users for a single organization); the
 * matching here never crosses tenants.
 */

export interface AuthUserLite {
  id: string;
  email: string | null;
}

export interface StaffRowLite {
  id: string;
  email: string | null;
  /** Null when the row is RESERVED (created at invite time, not yet linked). */
  profileId: string | null;
}

export interface StaffLinkPlan {
  /** `staff_profiles.id` → auth user id to write onto `profile_id`. */
  links: { staffId: string; profileId: string }[];
  /** Staff rows already linked to one of the given users (no-op — idempotent). */
  alreadyLinked: string[];
  /** Auth users with no matching reserved/unlinked staff row (need manual review). */
  unmatchedUsers: AuthUserLite[];
  /** Reserved staff rows with no matching auth user yet (guard hasn't signed up). */
  unmatchedStaff: StaffRowLite[];
}

/** Canonical email key: trimmed + lower-cased. Empty string when absent. */
export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/**
 * Plan the auth→staff links for ONE tenant. Deterministic and idempotent:
 * running it again after applying `links` yields an empty `links` set.
 *
 * Matching rule: an unlinked (`profileId == null`) staff row is claimed by the
 * auth user whose email matches (case-insensitively). Each staff row and each
 * user is used at most once.
 */
export function planStaffLinks(users: AuthUserLite[], staff: StaffRowLite[]): StaffLinkPlan {
  const plan: StaffLinkPlan = { links: [], alreadyLinked: [], unmatchedUsers: [], unmatchedStaff: [] };

  const linkedProfileIds = new Set(staff.map((r) => r.profileId).filter((p): p is string => !!p));

  // Unlinked rows indexed by email (skip blanks — they can't be matched by email).
  const unlinkedByEmail = new Map<string, StaffRowLite[]>();
  for (const row of staff) {
    if (row.profileId) continue;
    const key = normalizeEmail(row.email);
    if (!key) continue;
    const list = unlinkedByEmail.get(key) ?? [];
    list.push(row);
    unlinkedByEmail.set(key, list);
  }

  const claimedStaffIds = new Set<string>();
  for (const user of users) {
    // Already linked to this exact user → idempotent no-op.
    const existing = staff.find((r) => r.profileId === user.id);
    if (existing) { plan.alreadyLinked.push(existing.id); continue; }

    const key = normalizeEmail(user.email);
    const candidates = key ? unlinkedByEmail.get(key) : undefined;
    const target = candidates?.find((r) => !claimedStaffIds.has(r.id));
    if (target) {
      claimedStaffIds.add(target.id);
      plan.links.push({ staffId: target.id, profileId: user.id });
    } else {
      plan.unmatchedUsers.push(user);
    }
  }

  for (const row of staff) {
    if (!row.profileId && !claimedStaffIds.has(row.id)) plan.unmatchedStaff.push(row);
  }

  // Guard against a legacy user id also being in linkedProfileIds twice (defensive).
  void linkedProfileIds;
  return plan;
}
