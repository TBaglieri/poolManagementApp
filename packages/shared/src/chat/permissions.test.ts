import { describe, it, expect } from "vitest";
import {
  canCreateGroupChat, canToggleDirectMessages, canSendDirectMessage,
  canViewChannel, canPostToChannel, canManageChatMembers, membersAreSameTenant,
  type ChatChannelLike,
} from "./permissions";

/** Fix 5 — team-chat permission model, enforced identically in UI, store, and RLS. */

describe("group-chat creation", () => {
  it("a lifeguard CANNOT create a group chat", () => {
    expect(canCreateGroupChat("lifeguard")).toBe(false);
    expect(canCreateGroupChat("head_lifeguard")).toBe(false); // front-line, not a manager
    expect(canCreateGroupChat("swim_instructor")).toBe(false);
    expect(canCreateGroupChat("maintenance")).toBe(false);
  });

  it("a super admin / pool manager / facility manager CAN create a group chat", () => {
    expect(canCreateGroupChat("super_admin")).toBe(true);
    expect(canCreateGroupChat("org_admin")).toBe(true);       // Pool Manager (Villas label)
    expect(canCreateGroupChat("ops_manager")).toBe(true);
    expect(canCreateGroupChat("lifeguard_manager")).toBe(true);
    expect(canCreateGroupChat("scheduling_manager")).toBe(true);
  });
});

describe("disable-DMs toggle control", () => {
  it("only Super Admin and Pool Manager can flip it", () => {
    expect(canToggleDirectMessages("super_admin")).toBe(true);
    expect(canToggleDirectMessages("org_admin")).toBe(true);
  });
  it("managers below admin tier and staff cannot", () => {
    expect(canToggleDirectMessages("ops_manager")).toBe(false);
    expect(canToggleDirectMessages("lifeguard_manager")).toBe(false);
    expect(canToggleDirectMessages("lifeguard")).toBe(false);
  });
});

describe("sending direct messages", () => {
  it("a lifeguard can DM an admin when DMs are enabled", () => {
    expect(canSendDirectMessage("lifeguard", false)).toBe(true);
  });
  it("a lifeguard CANNOT DM when DMs are disabled", () => {
    expect(canSendDirectMessage("lifeguard", true)).toBe(false);
  });
  it("managers/admins can still DM when disabled (group chats unaffected)", () => {
    expect(canSendDirectMessage("org_admin", true)).toBe(true);
    expect(canSendDirectMessage("ops_manager", true)).toBe(true);
  });
});

describe("channel visibility, posting, and tenant isolation", () => {
  const villasGroup: ChatChannelLike = {
    chatType: "group", organizationId: "org_villas", createdBy: "s_admin",
    memberIds: ["s_admin", "s_guard"],
  };

  it("a member sees and can post to a group chat they're in", () => {
    const ctx = { orgId: "org_villas", staffId: "s_guard", role: "lifeguard" as const };
    expect(canViewChannel(villasGroup, ctx)).toBe(true);
    expect(canPostToChannel(villasGroup, ctx)).toBe(true); // all tiers may post to a chat they're in
  });

  it("a non-member in the same tenant cannot see the group chat", () => {
    expect(canViewChannel(villasGroup, { orgId: "org_villas", staffId: "s_other", role: "lifeguard" })).toBe(false);
  });

  it("NO chat or DM can span two tenants — a Tenant B user never sees a Tenant A chat", () => {
    // Even if (somehow) listed as a member id, a different org can never view it.
    const crossCtx = { orgId: "org_tidetown", staffId: "s_admin", role: "org_admin" as const };
    expect(canViewChannel(villasGroup, crossCtx)).toBe(false);
    expect(canPostToChannel(villasGroup, crossCtx)).toBe(false);
  });

  it("membersAreSameTenant rejects a cross-tenant member set", () => {
    expect(membersAreSameTenant("org_villas", ["org_villas", "org_villas"])).toBe(true);
    expect(membersAreSameTenant("org_villas", ["org_villas", "org_tidetown"])).toBe(false);
  });
});

describe("managing group members", () => {
  const group: ChatChannelLike = { chatType: "group", createdBy: "s_creator", memberIds: ["s_creator", "s_a"] };
  it("the creator can manage members", () => {
    expect(canManageChatMembers(group, { staffId: "s_creator", role: "lifeguard" })).toBe(true);
  });
  it("a manager who isn't the creator can manage members", () => {
    expect(canManageChatMembers(group, { staffId: "s_mgr", role: "org_admin" })).toBe(true);
  });
  it("a non-creator lifeguard member cannot manage members", () => {
    expect(canManageChatMembers(group, { staffId: "s_a", role: "lifeguard" })).toBe(false);
  });
});
