/**
 * Turn a new chat message into an inbox notification — the "push notification on new
 * message" hook. Pure so the rule (who gets notified, and what it says) is unit-tested
 * and identical wherever messages arrive (realtime subscription today; a server push
 * later). A member is notified of messages in their group chats and DMs, never of
 * their own messages, and never of announcement-channel posts (those have their own
 * announcement flow).
 */
import type { Channel, ID, Notification } from "../types";

/** Should `viewerStaffId` get an inbox notification for a message `senderStaffId` sent to `channel`? */
export function shouldNotifyMember(
  channel: Pick<Channel, "chatType" | "memberIds">,
  viewerStaffId: ID | null | undefined,
  senderStaffId: ID | null | undefined,
): boolean {
  if (!viewerStaffId || viewerStaffId === senderStaffId) return false; // never notify the sender
  if (channel.chatType !== "group" && channel.chatType !== "dm") return false; // member chats only
  return !!channel.memberIds?.includes(viewerStaffId);
}

const truncate = (s: string, n = 120) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Build the inbox Notification for a new chat message. `hrefBase` is the tenant path prefix (e.g. "/villas"). */
export function messageNotification(input: {
  channel: Pick<Channel, "id" | "name" | "chatType">;
  message: { id: ID; body: string; senderId: ID; sentAt?: string };
  senderName: string;
  hrefBase?: string;
}): Notification {
  const { channel, message, senderName, hrefBase = "" } = input;
  const isDm = channel.chatType === "dm";
  return {
    id: `ntf_msg_${message.id}`, // deterministic → de-dupes if the same event fires twice
    kind: "message",
    title: isDm ? `New message from ${senderName}` : `${senderName} in ${channel.name}`,
    body: truncate(message.body),
    at: message.sentAt ?? new Date().toISOString(),
    read: false,
    href: `${hrefBase}/chat`,
  };
}
