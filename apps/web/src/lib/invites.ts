"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uid, type RoleSlug } from "@poolops/shared";
import { activeMode, db } from "./repos/db";

export type InviteStatus = "draft" | "sent" | "pending" | "accepted" | "expired" | "canceled";

export interface ManagementPermissions {
  canInviteUsers: boolean;
  canManageRoles: boolean;
  canManageFacilities: boolean;
  canManagePayroll: boolean;
  canManageOnboarding: boolean;
  canApproveSchedules: boolean;
  canDeactivateUsers: boolean;
}

export const DEFAULT_MGMT_PERMS: ManagementPermissions = {
  canInviteUsers: false, canManageRoles: false, canManageFacilities: false,
  canManagePayroll: false, canManageOnboarding: false, canApproveSchedules: false, canDeactivateUsers: false,
};

export interface StaffInvitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleSlug;
  homeFacilityId: string;
  phone?: string;
  employmentStatus: string;
  status: InviteStatus;
  token: string;
  invitedBy: string;
  managementPermissions: ManagementPermissions;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface NewInviteInput {
  email: string; firstName: string; lastName: string; role: RoleSlug; homeFacilityId: string;
  phone?: string; employmentStatus?: string; managementPermissions?: Partial<ManagementPermissions>;
}

function makeToken(): string {
  return (crypto?.randomUUID?.() ?? uid("tok")).replace(/-/g, "").slice(0, 24);
}

interface InvitesState {
  invites: StaffInvitation[];
  /** Per-staff management-permission overrides keyed by staffId (delegation). */
  delegated: Record<string, ManagementPermissions>;
  createInvite: (input: NewInviteInput, invitedBy: string) => StaffInvitation;
  cancelInvite: (id: string) => void;
  resendInvite: (id: string) => void;
  acceptInvite: (token: string) => StaffInvitation | null;
  setDelegated: (staffId: string, perms: ManagementPermissions) => void;
}

export const useInvites = create<InvitesState>()(
  persist(
    (set, get) => ({
      invites: [],
      delegated: {},

      createInvite: (input, invitedBy) => {
        const now = new Date();
        const invite: StaffInvitation = {
          id: uid("inv"), email: input.email.trim().toLowerCase(), firstName: input.firstName, lastName: input.lastName,
          role: input.role, homeFacilityId: input.homeFacilityId, phone: input.phone,
          employmentStatus: input.employmentStatus ?? "active", status: "sent", token: makeToken(), invitedBy,
          managementPermissions: { ...DEFAULT_MGMT_PERMS, ...input.managementPermissions },
          createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 14 * 86400_000).toISOString(),
        };
        set((s) => ({ invites: [invite, ...s.invites] }));
        // Persist to Supabase (server route handles auth-user creation when configured).
        if (activeMode() === "supabase") {
          const client = db();
          client?.from("staff_invitations").insert({
            email: invite.email, first_name: invite.firstName, last_name: invite.lastName,
            role_id: invite.role, home_facility_id: null, status: "sent", invite_token: invite.token,
            expires_at: invite.expiresAt,
          }).then(() => { /* graceful: ignore if schema missing */ }, () => {});
        }
        return invite;
      },

      cancelInvite: (id) => set((s) => ({ invites: s.invites.map((i) => (i.id === id ? { ...i, status: "canceled" } : i)) })),
      resendInvite: (id) => set((s) => ({ invites: s.invites.map((i) => (i.id === id ? { ...i, status: "sent", createdAt: new Date().toISOString() } : i)) })),
      acceptInvite: (token) => {
        const invite = get().invites.find((i) => i.token === token);
        if (!invite) return null;
        set((s) => ({ invites: s.invites.map((i) => (i.token === token ? { ...i, status: "accepted", acceptedAt: new Date().toISOString() } : i)) }));
        return invite;
      },
      setDelegated: (staffId, perms) => set((s) => ({ delegated: { ...s.delegated, [staffId]: perms } })),
    }),
    { name: "poolops-invites", storage: createJSONStorage(() => localStorage) },
  ),
);

export const INVITE_STATUS_INTENT: Record<InviteStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  draft: "neutral", sent: "info", pending: "warning", accepted: "success", expired: "danger", canceled: "neutral",
};

export const MGMT_PERMISSION_LABELS: { key: keyof ManagementPermissions; label: string; need?: string }[] = [
  { key: "canInviteUsers", label: "Invite & create users" },
  { key: "canManageRoles", label: "Assign roles" },
  { key: "canManageFacilities", label: "Manage facilities" },
  { key: "canManagePayroll", label: "Manage payroll users" },
  { key: "canManageOnboarding", label: "Manage onboarding" },
  { key: "canApproveSchedules", label: "Approve schedules" },
  { key: "canDeactivateUsers", label: "Deactivate users" },
];
