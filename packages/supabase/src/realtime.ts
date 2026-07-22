/**
 * Reusable Supabase Realtime subscription helpers shared by web + mobile.
 *
 * Each helper returns a RealtimeChannel (or null in mock/unconfigured mode).
 * Always clean up: `const ch = subscribeToMessages(...); ...; client.removeChannel(ch)`.
 * Realtime must be enabled per-table in Supabase (see /supabase/realtime.sql).
 */
import type {
  RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient,
} from "@supabase/supabase-js";

export type ChangeHandler = (
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
) => void;

interface SubOpts {
  filter?: string; // e.g. "organization_id=eq.<uuid>"
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
}

function subscribeTable(
  client: SupabaseClient | null,
  table: string,
  handler: ChangeHandler,
  opts: SubOpts = {},
): RealtimeChannel | null {
  if (!client) return null;
  const channel = client
    .channel(`poolops:${table}:${opts.filter ?? "all"}:${Math.random().toString(36).slice(2, 7)}`)
    .on(
      // @ts-expect-error supabase-js postgres_changes typing is loose for dynamic tables
      "postgres_changes",
      { event: opts.event ?? "*", schema: "public", table, filter: opts.filter },
      handler,
    )
    .subscribe();
  return channel;
}

const orgFilter = (orgId?: string) => (orgId ? `organization_id=eq.${orgId}` : undefined);

export const subscribeToMessages = (c: SupabaseClient | null, h: ChangeHandler, channelId?: string) =>
  subscribeTable(c, "messages", h, { filter: channelId ? `channel_id=eq.${channelId}` : undefined });

export const subscribeToAnnouncements = (c: SupabaseClient | null, h: ChangeHandler, orgId?: string) =>
  subscribeTable(c, "announcements", h, { filter: orgFilter(orgId) });

export const subscribeToScheduleChanges = (c: SupabaseClient | null, h: ChangeHandler, orgId?: string) =>
  subscribeTable(c, "shifts", h, { filter: orgFilter(orgId) });

export const subscribeToShiftAssignments = (c: SupabaseClient | null, h: ChangeHandler, orgId?: string) =>
  subscribeTable(c, "shift_assignments", h, { filter: orgFilter(orgId) });

export const subscribeToScheduleDrafts = (c: SupabaseClient | null, h: ChangeHandler, orgId?: string) =>
  subscribeTable(c, "schedule_drafts", h, { filter: orgFilter(orgId) });

export const subscribeToScheduleDraftShifts = (c: SupabaseClient | null, h: ChangeHandler, draftId?: string) =>
  subscribeTable(c, "schedule_draft_shifts", h, { filter: draftId ? `draft_id=eq.${draftId}` : undefined });

export const subscribeToSchedulePublishEvents = (c: SupabaseClient | null, h: ChangeHandler, orgId?: string) =>
  subscribeTable(c, "schedule_publish_events", h, { filter: orgFilter(orgId) });

export const subscribeToTimeOffRequests = (c: SupabaseClient | null, h: ChangeHandler, orgId?: string) =>
  subscribeTable(c, "time_off_requests", h, { filter: orgFilter(orgId) });

export const subscribeToShiftTradeRequests = (c: SupabaseClient | null, h: ChangeHandler, orgId?: string) =>
  subscribeTable(c, "shift_trade_requests", h, { filter: orgFilter(orgId) });

export const subscribeToClockStatus = (c: SupabaseClient | null, h: ChangeHandler, orgId?: string) =>
  subscribeTable(c, "time_clock_entries", h, { filter: orgFilter(orgId) });

export const subscribeToFacilityStatus = (c: SupabaseClient | null, h: ChangeHandler, orgId?: string) =>
  subscribeTable(c, "facilities", h, { filter: orgFilter(orgId), event: "UPDATE" });

export const subscribeToMaintenanceIssues = (c: SupabaseClient | null, h: ChangeHandler, orgId?: string) =>
  subscribeTable(c, "maintenance_issues", h, { filter: orgFilter(orgId) });

export const subscribeToChemicalLogs = (c: SupabaseClient | null, h: ChangeHandler, orgId?: string) =>
  subscribeTable(c, "chemical_logs", h, { filter: orgFilter(orgId) });

export const subscribeToChecklistCompletions = (c: SupabaseClient | null, h: ChangeHandler, orgId?: string) =>
  subscribeTable(c, "checklist_completions", h, { filter: orgFilter(orgId) });

export const subscribeToNotifications = (c: SupabaseClient | null, h: ChangeHandler, userId?: string) =>
  subscribeTable(c, "notifications", h, { filter: userId ? `user_id=eq.${userId}` : undefined });

export const subscribeToStaffInvitations = (c: SupabaseClient | null, h: ChangeHandler, orgId?: string) =>
  subscribeTable(c, "staff_invitations", h, { filter: orgFilter(orgId) });

export const subscribeToRoleChanges = (c: SupabaseClient | null, h: ChangeHandler, orgId?: string) =>
  subscribeTable(c, "organization_members", h, { filter: orgFilter(orgId) });
