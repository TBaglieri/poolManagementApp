"use client";

import { useEffect } from "react";
import { repos, activeMode } from "@/lib/repos";
import { useDemo } from "@/lib/store";

/**
 * In Supabase mode, pulls live rows into the demo store on mount so existing
 * screens render real data. Only replaces a slice when Supabase actually
 * returned rows (source === "supabase"); otherwise the bundled demo data stays,
 * so the app never looks empty before the schema/seed is applied.
 */
export function SupabaseHydrator() {
  const hydrate = useDemo((s) => s.hydrate);

  useEffect(() => {
    if (activeMode() !== "supabase") return;
    let active = true;

    (async () => {
      const [messages, channels, chemicals, issues, notifications, clock] = await Promise.all([
        repos.chat.listMessages(),
        repos.chat.listChannels(),
        repos.chemicals.list(),
        repos.maintenance.list(),
        repos.notifications.list(),
        repos.timeClock.list(),
      ]);
      if (!active) return;

      const next: Parameters<typeof hydrate>[0] = {};
      if (messages.source === "supabase" && messages.data.length) next.messages = messages.data;
      if (channels.source === "supabase" && channels.data.length) next.channels = channels.data;
      if (chemicals.source === "supabase" && chemicals.data.length) next.chemicals = chemicals.data;
      if (issues.source === "supabase" && issues.data.length) next.issues = issues.data;
      if (notifications.source === "supabase" && notifications.data.length) next.notifications = notifications.data;
      if (clock.source === "supabase" && clock.data.length) next.clock = clock.data;
      if (Object.keys(next).length) hydrate(next);
    })().catch(() => { /* graceful: keep mock data */ });

    return () => { active = false; };
  }, [hydrate]);

  return null;
}
