"use client";

/**
 * Live team-chat delivery + the "push notification on new message" hook. In Supabase
 * mode it subscribes to message INSERTs and funnels each into the store's
 * receiveMessage, which appends the message (so it appears without a refresh) and, if
 * the signed-in user is a non-sender member of that chat, drops an item in the inbox
 * bell. Mock/demo mode has no live feed, so this renders nothing there.
 */
import { useEffect } from "react";
import { getBrowserSupabase, getEffectiveDataMode, subscribeToMessages } from "@poolops/supabase";
import { staffName, type Message } from "@poolops/shared";
import { useMyStaffId } from "@/lib/access";
import { useDemo } from "@/lib/store";

/** Map a realtime `messages` row to the app Message shape. */
function rowToMessage(r: Record<string, unknown>): Message {
  return {
    id: String(r.id),
    channelId: String(r.channel_id),
    senderId: String(r.sender_id ?? ""),
    body: String(r.body ?? ""),
    sentAt: String(r.created_at ?? new Date().toISOString()),
    pinned: Boolean(r.pinned),
    priority: (r.priority as Message["priority"]) ?? "normal",
    kind: (r.kind as Message["kind"]) ?? "message",
  };
}

export function ChatRealtime() {
  const viewerStaffId = useMyStaffId();
  const receiveMessage = useDemo((s) => s.receiveMessage);

  useEffect(() => {
    if (getEffectiveDataMode() !== "supabase") return;
    const client = getBrowserSupabase();
    if (!client) return;

    const channel = subscribeToMessages(client, (payload) => {
      if (payload.eventType !== "INSERT") return;
      const row = payload.new as Record<string, unknown>;
      if (!row?.id) return;
      const message = rowToMessage(row);
      receiveMessage(message, {
        viewerStaffId,
        senderName: staffName(message.senderId) || "A teammate",
        hrefBase: "", // links resolve within the current tenant path → "/chat"
      });
    });

    return () => { if (channel) client.removeChannel(channel); };
  }, [viewerStaffId, receiveMessage]);

  return null;
}
