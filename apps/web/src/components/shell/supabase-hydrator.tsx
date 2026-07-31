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
      // Re-fetch EVERY slice we persist, so a create/edit/assign that was written to
      // Supabase is still there after a refresh (previously time-off, trades, shifts,
      // and facilities were written but never re-loaded, so they appeared to vanish).
      const [messages, channels, chemicals, issues, notifications, clock, facilities, shifts, timeOff, trades, reports, patron, checklists, checklistTemplates, staff] = await Promise.all([
        repos.chat.listMessages(),
        repos.chat.listChannels(),
        repos.chemicals.list(),
        repos.maintenance.list(),
        repos.notifications.list(),
        repos.timeClock.list(),
        repos.facilities.list(),
        repos.scheduling.listShifts(),
        repos.timeOff.list(),
        repos.trades.list(),
        repos.reports.list(),
        repos.patron.list(),
        repos.checklists.list(),
        repos.checklistTemplates.list(),
        repos.staff.list(),
      ]);
      if (!active) return;

      const next: Parameters<typeof hydrate>[0] = {};
      if (staff.source === "supabase" && staff.data.length) next.staffRoster = staff.data;
      if (messages.source === "supabase" && messages.data.length) next.messages = messages.data;
      if (channels.source === "supabase" && channels.data.length) {
        // Reverse-map each channel's member profile-ids → staff ids via the roster, so
        // the app's staff-id membership logic (canViewChannel, member panel) works.
        const profileToStaff = new Map<string, string>();
        for (const p of staff.data) if (p.userId) profileToStaff.set(p.userId, p.id);
        next.channels = channels.data.map((c) => {
          const pids = (c as { memberProfileIds?: string[] }).memberProfileIds;
          if (!pids || !pids.length) return c;
          const memberIds = pids.map((pid) => profileToStaff.get(pid)).filter((x): x is string => !!x);
          return { ...c, memberIds };
        });
      }
      if (chemicals.source === "supabase" && chemicals.data.length) next.chemicals = chemicals.data;
      if (issues.source === "supabase" && issues.data.length) next.issues = issues.data;
      if (notifications.source === "supabase" && notifications.data.length) next.notifications = notifications.data;
      if (clock.source === "supabase" && clock.data.length) next.clock = clock.data;
      if (facilities.source === "supabase" && facilities.data.length) next.facilities = facilities.data;
      if (shifts.source === "supabase" && shifts.data.length) next.shifts = shifts.data;
      if (timeOff.source === "supabase" && timeOff.data.length) next.timeOff = timeOff.data;
      if (trades.source === "supabase" && trades.data.length) next.trades = trades.data;
      if (reports.source === "supabase" && reports.data.length) next.reports = reports.data;
      if (patron.source === "supabase" && patron.data.length) next.patron = patron.data;
      if (checklists.source === "supabase" && checklists.data.length) next.checklists = checklists.data;
      if (checklistTemplates.source === "supabase" && checklistTemplates.data.length) next.checklistTemplates = checklistTemplates.data;
      if (Object.keys(next).length) hydrate(next);
    })().catch(() => { /* graceful: keep mock data */ });

    return () => { active = false; };
  }, [hydrate]);

  return null;
}
