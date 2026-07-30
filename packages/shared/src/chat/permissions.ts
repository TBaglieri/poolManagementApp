/**
 * Team-chat permission model — the SINGLE source of truth, enforced identically in
 * the UI, the store, and (mirrored) in Supabase RLS. Pure and framework-free so it
 * is unit-testable and can't drift between "what the UI hides" and "what the backend
 * allows" (a lifeguard must not be able to create a group chat via a raw API call).
 *
 * Rules (from the brief):
 *   • Create GROUP chats: Super Admin + Pool Manager / facility-level managers and up.
 *     Lifeguards (and other front-line staff) CANNOT create group chats — they only
 *     participate in and post to chats they've been added to.
 *   • Manage a group chat's members: its creator, or any manager-tier user.
 *   • Direct DMs: open to everyone by default; anyone may DM anyone (incl. admins).
 *   • "Disable DMs" org toggle: controlled by Super Admin + Pool Manager only. When
 *     ON, front-line staff can no longer START or SEND DMs (group chats unaffected);
 *     managers/admins may still DM. It is an org-wide switch.
 *   • Tenant isolation: a chat/DM is only ever visible within its own tenant.
 */
import { getRole } from "../rbac/roles";
import type { ChatType, ID, RoleSlug } from "../types";

/**
 * Role `level` at/above which a user is a MANAGER — Pool Manager / facility manager
 * and up. Group-chat creation and member management require this; front-line staff
 * (lifeguard 10, head_lifeguard 30, swim_instructor 25, maintenance 20, auditor 15)
 * are below it. Change this one number to widen/narrow who can create group chats.
 */
export const MANAGER_MIN_LEVEL = 50;

/**
 * Admin tier — Pool Manager (org_admin, level 90) and Super Admin (100). Controls the
 * org-wide "disable direct messages" toggle. Raise/lower to taste (e.g. drop to
 * MANAGER_MIN_LEVEL to let facility managers flip it too).
 */
export const DM_TOGGLE_MIN_LEVEL = 90;

function levelOf(role: RoleSlug | null | undefined): number {
  return role ? getRole(role).level : 0;
}

/** Manager-tier (facility-level manager and up)? */
export function isManagerTier(role: RoleSlug | null | undefined): boolean {
  return levelOf(role) >= MANAGER_MIN_LEVEL;
}

/** Can this role CREATE group chats? Managers and up — never front-line staff. */
export function canCreateGroupChat(role: RoleSlug | null | undefined): boolean {
  return isManagerTier(role);
}

/** Can this role flip the org-wide "disable direct messages" toggle? Super Admin + Pool Manager. */
export function canToggleDirectMessages(role: RoleSlug | null | undefined): boolean {
  return levelOf(role) >= DM_TOGGLE_MIN_LEVEL;
}

/**
 * Can this role START or SEND a direct message right now? Open to everyone by
 * default; when DMs are disabled org-wide, only manager-tier users may still DM
 * (front-line staff are blocked, including DMs to admins). Group chats are unaffected.
 */
export function canSendDirectMessage(role: RoleSlug | null | undefined, dmsDisabled: boolean): boolean {
  if (!role) return false;
  if (!dmsDisabled) return true;
  return isManagerTier(role);
}

/** The minimal channel shape these guards need (works for the store type and the DB row). */
export interface ChatChannelLike {
  chatType?: ChatType;
  organizationId?: ID | null;
  memberIds?: ID[];
  restrictedToRoles?: RoleSlug[];
  createdBy?: ID | null;
}

/** Context for the acting user. */
export interface ChatUserContext {
  orgId?: ID | null;
  /** The user's staff_profiles.id — how membership is keyed. */
  staffId?: ID | null;
  role?: RoleSlug | null;
}

const isMemberChannel = (c: ChatChannelLike) => c.chatType === "group" || c.chatType === "dm";

/**
 * Is `channel` visible to this user? Tenant-isolated first (never across orgs), then:
 * group/dm require explicit membership; announcement channels honor restrictedToRoles
 * (or are open to the whole org).
 */
export function canViewChannel(channel: ChatChannelLike, ctx: ChatUserContext): boolean {
  // Tenant isolation — a chat is only ever visible within its own tenant.
  if (channel.organizationId != null && ctx.orgId != null && channel.organizationId !== ctx.orgId) return false;

  if (isMemberChannel(channel)) {
    return !!ctx.staffId && !!channel.memberIds?.includes(ctx.staffId);
  }
  if (channel.restrictedToRoles && channel.restrictedToRoles.length > 0) {
    return !!ctx.role && channel.restrictedToRoles.includes(ctx.role);
  }
  return true;
}

/**
 * Can the user POST to this channel? For group chats and DMs, membership is enough
 * (all tiers may post to a chat they're in). Announcement channels gate posting on
 * the `chat.announce` permission, checked by the caller — here we only require view.
 */
export function canPostToChannel(channel: ChatChannelLike, ctx: ChatUserContext): boolean {
  return canViewChannel(channel, ctx);
}

/** Can the user add/remove members of this group chat? Its creator, or any manager. */
export function canManageChatMembers(channel: ChatChannelLike, ctx: ChatUserContext): boolean {
  if (channel.chatType !== "group") return false;
  if (channel.createdBy && ctx.staffId && channel.createdBy === ctx.staffId) return true;
  return isManagerTier(ctx.role);
}

/** True when every member org id matches the creating org — the tenant-scoping guard for creation. */
export function membersAreSameTenant(orgId: ID, memberOrgIds: Array<ID | null | undefined>): boolean {
  return memberOrgIds.every((o) => o == null || o === orgId);
}
