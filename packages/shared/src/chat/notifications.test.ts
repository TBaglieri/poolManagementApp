import { describe, it, expect } from "vitest";
import { shouldNotifyMember, messageNotification } from "./notifications";
import type { Channel } from "../types";

const group: Pick<Channel, "chatType" | "memberIds"> = { chatType: "group", memberIds: ["s_admin", "s_guard"] };
const dm: Pick<Channel, "chatType" | "memberIds"> = { chatType: "dm", memberIds: ["s_admin", "s_guard"] };
const announce: Pick<Channel, "chatType" | "memberIds"> = { chatType: "announcement", memberIds: undefined };

describe("shouldNotifyMember — who gets pinged for a new message", () => {
  it("notifies a member who did NOT send it", () => {
    expect(shouldNotifyMember(group, "s_guard", "s_admin")).toBe(true);
    expect(shouldNotifyMember(dm, "s_guard", "s_admin")).toBe(true);
  });
  it("never notifies the sender of their own message", () => {
    expect(shouldNotifyMember(group, "s_admin", "s_admin")).toBe(false);
  });
  it("does not notify a non-member", () => {
    expect(shouldNotifyMember(group, "s_other", "s_admin")).toBe(false);
  });
  it("ignores announcement channels (own flow)", () => {
    expect(shouldNotifyMember(announce, "s_guard", "s_admin")).toBe(false);
  });
});

describe("messageNotification — inbox item shape", () => {
  it("labels a DM by sender and a group by chat name, links to chat", () => {
    const dmN = messageNotification({ channel: { id: "d1", name: "Dana W.", chatType: "dm" }, message: { id: "m1", body: "hey", senderId: "s_admin" }, senderName: "Dana", hrefBase: "/villas" });
    expect(dmN.kind).toBe("message");
    expect(dmN.title).toBe("New message from Dana");
    expect(dmN.href).toBe("/villas/chat");
    expect(dmN.read).toBe(false);
    expect(dmN.id).toBe("ntf_msg_m1"); // deterministic → de-dupes

    const grpN = messageNotification({ channel: { id: "g1", name: "Lifeguard chat", chatType: "group" }, message: { id: "m2", body: "shift update", senderId: "s_admin" }, senderName: "Dana" });
    expect(grpN.title).toBe("Dana in Lifeguard chat");
    expect(grpN.href).toBe("/chat");
  });
  it("truncates long bodies", () => {
    const long = "x".repeat(200);
    expect(messageNotification({ channel: { id: "g1", name: "c", chatType: "group" }, message: { id: "m3", body: long, senderId: "s" }, senderName: "A" }).body.length).toBeLessThanOrEqual(120);
  });
});
