"use client";

/**
 * PoolOps Pro data-provider / repository layer.
 *
 * Components call `repos.<domain>.<method>()` instead of importing seed data or
 * Supabase directly. Every method works in BOTH modes:
 *   • mock      → bundled demo data (and in-memory mutation via the zustand store)
 *   • supabase  → real Postgres via the RLS-protected anon client, falling back
 *                 to mock on any error (missing table, network, etc.)
 *
 * The active mode comes from NEXT_PUBLIC_DATA_MODE (see @poolops/supabase/config).
 */
import {
  facilities as seedFacilities, staff as seedStaff, organization as seedOrg,
  channels as seedChannels, messages as seedMessages, notifications as seedNotifications,
  chemicalLogs as seedChem, maintenanceIssues as seedIssues, timeClockEntries as seedClock,
  timeOffRequests as seedTimeOff, shiftTradeRequests as seedTrades, shifts as seedShifts, lessonClasses as seedLessons,
  households as seedHouseholds, members as seedMembers, documents as seedDocuments,
  inspectionResults as seedInspections, staffCertifications as seedCerts,
  SUBSCRIPTION_PLANS, SETUP_PACKAGES,
  type Facility, type StaffProfile, type Organization, type Channel, type Message,
  type Notification, type ChemicalLog, type MaintenanceIssue, type TimeClockEntry,
  type TimeOffRequest, type Shift, type ShiftTradeRequest, type RequestStatus,
  type ShiftReport, type PatronCount, type ChecklistCompletion, type ChecklistTemplate, type OnboardingSubmission, type Pool,
  shiftReports as seedReports, patronCounts as seedPatron, checklistCompletions as seedChecklists,
  checklistTemplates as seedChecklistTemplates, onboardingSubmissions as seedOnboarding, pools as seedPools,
} from "@poolops/shared";
import { activeMode, selectOr, insertOr, updateOr, db, type RepoResult, type DataSource } from "./db";
import { reportPersistError } from "./persist-status";

export { activeMode } from "./db";
export { checkHealth, useHealth, healthLabel, type Health, type HealthStatus } from "./health";

/* --------------------------------- mappers -------------------------------- */
const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const n = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const b = (v: unknown) => v === true || v === "true";
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function mapFacility(r: any): Facility {
  return {
    id: s(r.id), orgId: s(r.organization_id), name: s(r.name), address: s(r.address),
    poolType: (r.pool_type ?? "indoor"), operatingHours: s(r.operating_hours), capacity: n(r.capacity),
    emergencyPhone: s(r.emergency_phone), managerId: r.manager_id ?? undefined, status: (r.status ?? "open"),
    chemicalRanges: r.chemical_ranges ?? seedFacilities[0].chemicalRanges,
    inspectionRequired: b(r.inspection_required), imageHint: r.image_hint ?? "from-cyan-500 to-blue-600",
  };
}

function mapMessage(r: any): Message {
  return {
    id: s(r.id), channelId: s(r.channel_id), senderId: s(r.sender_id), body: s(r.body),
    sentAt: s(r.created_at ?? r.sent_at), pinned: b(r.pinned), priority: r.priority ?? "normal",
    kind: r.kind ?? "message", template: r.template ?? undefined, linkUrl: r.link_url ?? undefined,
  };
}

function mapChannel(r: any): Channel {
  return {
    id: s(r.id), name: s(r.name), kind: (r.kind ?? "all_staff"), description: s(r.description),
    facilityId: r.facility_id ?? undefined, restrictedToRoles: r.restricted_to_roles ?? undefined, unread: 0,
    chatType: r.chat_type ?? undefined, organizationId: r.organization_id ?? undefined, createdBy: r.created_by ?? undefined,
    memberIds: r.member_ids ?? undefined,
  };
}

function mapNotification(r: any): Notification {
  return {
    id: s(r.id), kind: (r.kind ?? "system"), title: s(r.title), body: s(r.body),
    at: s(r.created_at ?? r.at), read: b(r.read), href: r.href ?? undefined,
  };
}

function mapMaintenance(r: any): MaintenanceIssue {
  return {
    id: s(r.id), facilityId: s(r.facility_id), area: s(r.area), title: s(r.title),
    description: s(r.description), priority: (r.priority ?? "medium"), status: (r.status ?? "new"),
    reportedBy: s(r.reported_by), assignedTo: r.assigned_to ?? null, reportedAt: s(r.created_at ?? r.reported_at),
    dueDate: r.due_date ?? undefined, hasPhoto: b(r.photo_path) || b(r.has_photo),
  };
}

function mapChem(r: any): ChemicalLog {
  return {
    id: s(r.id), facilityId: s(r.facility_id), poolId: s(r.pool_id), recordedBy: s(r.recorded_by),
    takenAt: s(r.taken_at ?? r.created_at ?? r.recorded_at),
    recordedAt: s(r.created_at ?? r.recorded_at), freeChlorine: n(r.free_chlorine), combinedChlorine: n(r.combined_chlorine),
    ph: n(r.ph), alkalinity: n(r.alkalinity), calciumHardness: n(r.calcium_hardness), cyanuricAcid: n(r.cyanuric_acid),
    waterTemp: n(r.water_temp), notes: r.notes ?? undefined, correctiveAction: r.corrective_action ?? undefined,
    outOfRange: arr<string>(r.out_of_range),
  };
}

function mapClock(r: any): TimeClockEntry {
  return {
    id: s(r.id), staffId: s(r.staff_id), facilityId: s(r.facility_id), clockIn: r.clock_in ?? null,
    clockOut: r.clock_out ?? null, breakMinutes: n(r.break_minutes), status: (r.status ?? "clocked_in"),
    flagged: b(r.flagged), note: r.note ?? undefined,
  };
}

function mapShift(r: any): Shift {
  return {
    id: s(r.id), facilityId: s(r.facility_id), position: r.position ?? "lifeguard",
    date: s(r.shift_date ?? r.date), start: s(r.start_time ?? r.start), end: s(r.end_time ?? r.end),
    assignedStaffId: r.assigned_staff_id ?? null, status: r.status ?? "published", notes: r.notes ?? undefined,
  };
}

function mapTrade(r: any): ShiftTradeRequest {
  return {
    id: s(r.id), shiftId: s(r.shift_id), requestedBy: s(r.requested_by),
    requestedTo: r.requested_to ?? null, reason: s(r.reason), status: r.status ?? "pending",
    submittedAt: s(r.created_at ?? r.submitted_at),
  };
}

function mapTimeOff(r: any): TimeOffRequest {
  return {
    id: s(r.id), staffId: s(r.staff_id), startDate: s(r.start_date), endDate: s(r.end_date),
    reason: s(r.reason), type: r.type ?? "vacation", status: r.status ?? "pending",
    submittedAt: s(r.created_at ?? r.submitted_at), reviewedBy: r.reviewed_by ?? undefined,
  };
}

function mapShiftReport(r: any): ShiftReport {
  return {
    id: s(r.id), facilityId: s(r.facility_id), staffId: s(r.staff_id), shiftLabel: s(r.shift_label),
    date: s(r.report_date ?? r.created_at), weather: s(r.weather), staffingNotes: s(r.staffing_notes),
    incidents: s(r.incidents), maintenanceConcerns: s(r.maintenance_concerns), patronIssues: s(r.patron_issues),
    suppliesNeeded: s(r.supplies_needed), managerNotes: r.manager_notes ?? undefined,
    reviewStatus: (r.review_status ?? "submitted"),
  };
}

function mapPatron(r: any): PatronCount {
  return {
    id: s(r.id), facilityId: s(r.facility_id), recordedAt: s(r.created_at), recordedBy: s(r.recorded_by),
    timeSlot: s(r.time_slot), count: n(r.count),
  };
}

function mapChecklistCompletion(r: any): ChecklistCompletion {
  return {
    id: s(r.id), templateId: s(r.template_id), facilityId: s(r.facility_id), completedBy: s(r.completed_by),
    completedAt: s(r.created_at), status: (r.status ?? "complete"), checkedItemIds: arr(r.checked_item_ids),
    note: r.note ?? undefined,
  };
}

function mapChecklistTemplate(r: any): ChecklistTemplate {
  return {
    id: s(r.id), name: s(r.name), kind: (r.kind ?? "opening"), cadence: (r.cadence ?? "daily"),
    facilityIds: arr(r.facility_ids), items: Array.isArray(r.items) ? r.items : [], archived: b(r.archived),
  };
}

function mapPool(r: any): Pool {
  return {
    id: s(r.id), facilityId: s(r.facility_id), name: s(r.name), poolType: (r.pool_type ?? "leisure"),
    volumeGallons: n(r.volume_gallons), maxDepthFt: n(r.max_depth_ft),
  };
}

function mapOnboarding(r: any): OnboardingSubmission {
  return {
    id: s(r.id), staffId: s(r.staff_id), step: r.step, status: r.status ?? "not_started",
    submittedAt: r.submitted_at ?? undefined, reviewedBy: r.reviewed_by ?? undefined,
  };
}

/* ------------------------------- repositories ----------------------------- */

export const repos = {
  mode: activeMode,

  organizations: {
    async current(): Promise<RepoResult<Organization>> {
      if (activeMode() !== "supabase") return { data: seedOrg, source: "mock", error: null };
      const r = await selectOr<any, Organization>("organizations", [seedOrg], (row) => ({
        id: s(row.id), name: s(row.name), type: row.type ?? "community_pool", timezone: s(row.timezone),
        seasonStart: s(row.season_start), seasonEnd: s(row.season_end), accentColor: s(row.accent_color),
        plan: row.plan ?? "small", createdAt: s(row.created_at),
      }), (q) => q.limit(1));
      return { data: r.data[0] ?? seedOrg, source: r.source, error: r.error };
    },
    // Org-wide "disable direct messages" flag. Written via an RPC that enforces
    // is_org_admin server-side (set_org_dms); read back on load to restore the toggle.
    async setDmsDisabled(disabled: boolean) {
      const client = db();
      if (activeMode() !== "supabase" || !client) return { ok: true as const };
      const { error } = await (client.rpc as any)("set_org_dms", { disabled });
      if (error) reportPersistError("organizations", "update", error.message);
      return { ok: !error };
    },
    async getDmsDisabled(): Promise<boolean | null> {
      const client = db();
      if (activeMode() !== "supabase" || !client) return null;
      const { data } = await client.from("organizations").select("dms_disabled").maybeSingle();
      return (data as { dms_disabled?: boolean } | null)?.dms_disabled ?? null;
    },
  },

  facilities: {
    list: () => selectOr<any, Facility>("facilities", seedFacilities, mapFacility),
    listPools: () => selectOr<any, Pool>("pools", seedPools, mapPool),
    create: (payload: Record<string, unknown>) => insertOr<Facility>("facilities", payload, mapFacility),
    createPool: (payload: Record<string, unknown>) => insertOr("pools", payload),
  },

  // Shift reports, patron counts, checklist completions, onboarding — org id is
  // stamped by the DB trigger (supabase/org-defaults.sql), so payloads omit it.
  reports: {
    list: () => selectOr<any, ShiftReport>("shift_reports", seedReports, mapShiftReport, (q) => q.order("created_at", { ascending: false })),
    create: (payload: Record<string, unknown>) => insertOr<ShiftReport>("shift_reports", payload, mapShiftReport),
    update: (id: string, patch: Record<string, unknown>) => updateOr<ShiftReport>("shift_reports", id, patch, mapShiftReport),
  },
  patron: {
    list: () => selectOr<any, PatronCount>("patron_counts", seedPatron, mapPatron, (q) => q.order("created_at", { ascending: false })),
    create: (payload: Record<string, unknown>) => insertOr<PatronCount>("patron_counts", payload, mapPatron),
  },
  checklists: {
    list: () => selectOr<any, ChecklistCompletion>("checklist_completions", seedChecklists, mapChecklistCompletion, (q) => q.order("created_at", { ascending: false })),
    create: (payload: Record<string, unknown>) => insertOr<ChecklistCompletion>("checklist_completions", payload, mapChecklistCompletion),
  },
  onboarding: {
    list: () => selectOr<any, OnboardingSubmission>("onboarding_submissions", seedOnboarding, mapOnboarding, (q) => q.order("created_at", { ascending: false })),
    // One row per (staff, step) — upsert so a step's status updates in place (org id via trigger).
    async upsertStep(payload: { staff_id: string; step: string; status: string; submitted_at: string | null }) {
      const client = db();
      if (activeMode() !== "supabase" || !client) return { ok: true as const };
      const { error } = await client.from("onboarding_submissions").upsert(payload as any, { onConflict: "staff_id,step" });
      if (error) reportPersistError("onboarding_submissions", "insert", error.message);
      return { ok: !error };
    },
  },
  // Admin-created checklist definitions (items stored inline as jsonb). Persisted so a
  // checklist created by an admin is visible to lifeguards (org id via trigger).
  checklistTemplates: {
    list: () => selectOr<any, ChecklistTemplate>("checklist_templates", seedChecklistTemplates, mapChecklistTemplate, (q) => q.order("created_at", { ascending: false })),
    create: (t: ChecklistTemplate) => insertOr<ChecklistTemplate>("checklist_templates", {
      id: t.id, name: t.name, kind: t.kind, cadence: t.cadence, facility_ids: t.facilityIds, items: t.items, archived: t.archived ?? false,
    }, mapChecklistTemplate),
    update: (id: string, patch: Record<string, unknown>) => updateOr<ChecklistTemplate>("checklist_templates", id, patch, mapChecklistTemplate),
    async remove(id: string) {
      const client = db();
      if (activeMode() === "supabase" && client) await client.from("checklist_templates").delete().eq("id", id);
    },
  },

  staff: {
    list: () => selectOr<any, StaffProfile>("staff_profiles", seedStaff, (r) => ({
      ...seedStaff[0], id: s(r.id), orgId: s(r.organization_id),
      // userId = the linked auth profile id (staff_profiles.profile_id). This is the
      // staff↔profile bridge used to write channel_members (profile ids) and to
      // resolve reloaded actor ids (auth uid) back to a staff name.
      userId: s(r.profile_id), firstName: s(r.first_name ?? seedStaff[0].firstName),
      lastName: s(r.last_name ?? ""), title: s(r.title), primaryRole: r.primary_role ?? "lifeguard",
      roles: arr(r.roles), homeFacilityId: s(r.home_facility_id), facilityIds: arr(r.facility_ids),
      age: n(r.age), isMinor: b(r.is_minor), preferredHoursPerWeek: n(r.preferred_hours_per_week),
      onboardingComplete: n(r.onboarding_complete),
    })),
  },

  chat: {
    async listChannels() {
      const base = await selectOr<any, Channel>("channels", seedChannels, mapChannel);
      if (base.source !== "supabase") return base;
      const client = db();
      if (!client) return base;
      try {
        // Attach each channel's member profile-ids (reverse-mapped to staff ids on hydrate).
        const { data: members } = await client.from("channel_members").select("channel_id, profile_id");
        const byChannel = new Map<string, string[]>();
        for (const m of (members ?? []) as Array<{ channel_id: string; profile_id: string }>) {
          const list = byChannel.get(m.channel_id) ?? [];
          list.push(m.profile_id); byChannel.set(m.channel_id, list);
        }
        return { ...base, data: base.data.map((c) => ({ ...c, memberProfileIds: byChannel.get(c.id) ?? [] })) };
      } catch { return base; }
    },
    listMessages: () => selectOr<any, Message>("messages", seedMessages, mapMessage, (q) => q.order("created_at", { ascending: true })),
    async postMessage(channelId: string, _senderId: string, body: string, opts: Partial<Message> = {}) {
      // sender_id omitted → trigger sets auth.uid() (messages_post RLS requires it,
      // and the column is a profiles(id) FK the app's staff id can't satisfy).
      return insertOr<Message>("messages", {
        channel_id: channelId, body,
        pinned: opts.pinned ?? false, priority: opts.priority ?? "normal",
        kind: opts.kind ?? "message", template: opts.template ?? null, link_url: opts.linkUrl ?? null,
      }, mapMessage);
    },
    // Best-effort persistence for team chat (group chats, DMs, membership). In mock
    // mode these no-op; in supabase mode RLS (supabase/chat.sql) enforces who may
    // create/join, so a lifeguard can't create a group chat via a raw call.
    // organization_id and created_by are omitted on purpose — DB triggers stamp the
    // caller's real org id and auth.uid() (org-defaults.sql / insert-actor.sql), and an
    // AFTER INSERT trigger (chat.sql) adds the CREATOR to channel_members. The OTHER
    // members are inserted here by their profile ids (the store resolves staff→profile
    // via the roster's userId), so a group's full roster persists and reloads.
    async createGroupChat(input: { id: string; name: string; description?: string; memberProfileIds: string[] }) {
      await insertOr("channels", {
        id: input.id, name: input.name, kind: "group", chat_type: "group", description: input.description ?? null,
      });
      for (const pid of input.memberProfileIds) await insertOr("channel_members", { channel_id: input.id, profile_id: pid });
    },
    async createDirectChat(input: { id: string; toProfileId: string }) {
      await insertOr("channels", { id: input.id, name: "Direct message", kind: "dm", chat_type: "dm" });
      if (input.toProfileId) await insertOr("channel_members", { channel_id: input.id, profile_id: input.toProfileId });
    },
    async addChannelMember(channelId: string, profileId: string) {
      await insertOr("channel_members", { channel_id: channelId, profile_id: profileId });
    },
    async removeChannelMember(channelId: string, profileId: string) {
      const client = db();
      if (client) await client.from("channel_members").delete().eq("channel_id", channelId).eq("profile_id", profileId);
    },
    setPinned: (id: string, pinned: boolean) => updateOr<Message>("messages", id, { pinned }, mapMessage),
  },

  notifications: {
    list: () => selectOr<any, Notification>("notifications", seedNotifications, mapNotification, (q) => q.order("created_at", { ascending: false })),
  },

  chemicals: {
    list: () => selectOr<any, ChemicalLog>("chemical_logs", seedChem, mapChem, (q) => q.order("created_at", { ascending: false })),
    create: (payload: Record<string, unknown>) => insertOr<ChemicalLog>("chemical_logs", payload, mapChem),
  },

  maintenance: {
    list: () => selectOr<any, MaintenanceIssue>("maintenance_issues", seedIssues, mapMaintenance, (q) => q.order("created_at", { ascending: false })),
    create: (payload: Record<string, unknown>) => insertOr<MaintenanceIssue>("maintenance_issues", payload, mapMaintenance),
    /** Change status, assign, set due date, etc. */
    update: (id: string, patch: Record<string, unknown>) => updateOr<MaintenanceIssue>("maintenance_issues", id, patch, mapMaintenance),
  },

  timeClock: {
    list: () => selectOr<any, TimeClockEntry>("time_clock_entries", seedClock, mapClock, (q) => q.order("clock_in", { ascending: false })),
    create: (payload: Record<string, unknown>) => insertOr<TimeClockEntry>("time_clock_entries", payload, mapClock),
    /** Clock-out, break, flag, and manager adjustments all funnel through here. */
    update: (id: string, patch: Record<string, unknown>) => updateOr<TimeClockEntry>("time_clock_entries", id, patch, mapClock),
  },

  timeOff: {
    list: () => selectOr<any, TimeOffRequest>("time_off_requests", seedTimeOff, mapTimeOff, (q) => q.order("created_at", { ascending: false })),
    listApproved: () => selectOr<any, TimeOffRequest>("time_off_requests",
      seedTimeOff.filter((t) => t.status === "approved"), mapTimeOff, (q) => q.eq("status", "approved")),
    create: (payload: {
      staffId: string; startDate: string; endDate: string; reason?: string; type?: string; organizationId?: string;
    }) => insertOr<TimeOffRequest>("time_off_requests", {
      staff_id: payload.staffId, start_date: payload.startDate, end_date: payload.endDate,
      reason: payload.reason ?? null, type: payload.type ?? "vacation", status: "pending",
      organization_id: payload.organizationId ?? null,
    }, mapTimeOff),
    /** Approve/deny a request; records the reviewer. */
    review: (id: string, status: RequestStatus, reviewerProfileId?: string) =>
      updateOr<TimeOffRequest>("time_off_requests", id, { status, reviewed_by: reviewerProfileId ?? null }, mapTimeOff),
  },

  scheduling: {
    listShifts: () => selectOr<any, Shift>("shifts", seedShifts, mapShift, (q) => q.order("shift_date", { ascending: true })),
    createShift: (payload: {
      facilityId: string; position: string; date: string; start: string; end: string;
      assignedStaffId?: string | null; status?: string; notes?: string; organizationId?: string;
    }) => insertOr<Shift>("shifts", {
      facility_id: payload.facilityId, position: payload.position, shift_date: payload.date,
      start_time: payload.start, end_time: payload.end, assigned_staff_id: payload.assignedStaffId ?? null,
      status: payload.status ?? (payload.assignedStaffId ? "assigned" : "open"), notes: payload.notes ?? null,
      organization_id: payload.organizationId ?? null,
    }, mapShift),
    /** Assign/unassign, change status, or edit notes on an existing shift. */
    updateShift: (id: string, patch: Partial<{ assignedStaffId: string | null; status: string; notes: string; position: string; start: string; end: string; date: string }>) =>
      updateOr<Shift>("shifts", id, {
        ...(patch.assignedStaffId !== undefined ? { assigned_staff_id: patch.assignedStaffId } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.position !== undefined ? { position: patch.position } : {}),
        ...(patch.start !== undefined ? { start_time: patch.start } : {}),
        ...(patch.end !== undefined ? { end_time: patch.end } : {}),
        ...(patch.date !== undefined ? { shift_date: patch.date } : {}),
      }, mapShift),
  },

  /** Shift swap / sub requests (staff ask to give up or trade a shift). */
  trades: {
    list: () => selectOr<any, ShiftTradeRequest>("shift_trade_requests", seedTrades, mapTrade, (q) => q.order("created_at", { ascending: false })),
    create: (payload: {
      shiftId: string; requestedBy: string; requestedTo?: string | null; reason?: string; organizationId?: string;
    }) => insertOr<ShiftTradeRequest>("shift_trade_requests", {
      shift_id: payload.shiftId, requested_by: payload.requestedBy, requested_to: payload.requestedTo ?? null,
      reason: payload.reason ?? null, status: "pending", organization_id: payload.organizationId ?? null,
    }, mapTrade),
    /** Approve/deny a swap request. On approval the caller reassigns the shift. */
    review: (id: string, status: RequestStatus) =>
      updateOr<ShiftTradeRequest>("shift_trade_requests", id, { status }, mapTrade),
  },

  quoteRequests: {
    /** Real Supabase insert in supabase mode; mock no-op otherwise. */
    async create(payload: {
      organizationName: string; contactName: string; email: string; phone?: string;
      orgType?: string; facilityCount?: number; poolCount?: number; staffCount?: number;
      recommendedPlan?: string; modules?: string[]; message?: string;
    }) {
      return insertOr("quote_requests", {
        organization_name: payload.organizationName, contact_name: payload.contactName, email: payload.email,
        phone: payload.phone ?? null, org_type: payload.orgType ?? null, facility_count: payload.facilityCount ?? null,
        pool_count: payload.poolCount ?? null, staff_count: payload.staffCount ?? null,
        recommended_plan: payload.recommendedPlan ?? null, modules: payload.modules ?? [],
        message: payload.message ?? null, status: "new",
      });
    },
  },

  pricing: {
    plans: () => SUBSCRIPTION_PLANS,
    setupPackages: () => SETUP_PACKAGES,
  },

  /** White-label tenant config persistence (org-scoped by RLS). */
  tenants: {
    /**
     * Persist a tenant config override to the org's `config` column. Best-effort:
     * only runs in supabase mode for an authenticated admin (RLS restricts the
     * update to their own org). The admin UI always keeps a localStorage copy too.
     */
    async saveConfig(slug: string, override: unknown): Promise<{ ok: boolean; source: DataSource; error: string | null }> {
      if (activeMode() !== "supabase") return { ok: true, source: "mock", error: null };
      const client = db();
      if (!client) return { ok: false, source: "mock", error: "Supabase not configured" };
      try {
        const { error } = await client.from("organizations").update({ config: override as any }).eq("slug", slug);
        return { ok: !error, source: "supabase", error: error?.message ?? null };
      } catch (e: any) {
        return { ok: false, source: "supabase", error: e?.message ?? "Save failed" };
      }
    },
  },

  billing: {
    async subscription(): Promise<RepoResult<{ tier: string; status: string } | null>> {
      if (activeMode() !== "supabase") return { data: { tier: "medium", status: "active" }, source: "mock", error: null };
      const r = await selectOr<any, { tier: string; status: string }>("organization_subscriptions",
        [{ tier: "medium", status: "active" }], (row) => ({ tier: s(row.plan_tier), status: s(row.billing_status) }), (q) => q.limit(1));
      return { data: r.data[0] ?? null, source: r.source, error: r.error };
    },
  },

  /** Real-customer organization setup: org → membership (current user = admin) → first facility. */
  orgSetup: {
    async create(input: {
      orgName: string; orgType: string; plan: string; setupPackage: string;
      facilityCount: number; poolCount: number; staffEstimate: number;
      firstFacility: { name: string; address: string; hours: string; poolType: string; capacity: number };
    }): Promise<{ ok: boolean; source: DataSource; orgId: string | null; error: string | null }> {
      if (activeMode() !== "supabase") {
        return { ok: true, source: "mock", orgId: "org_local_demo", error: null };
      }
      const client = db();
      if (!client) return { ok: false, source: "mock", orgId: null, error: "Supabase not configured" };
      try {
        const { data: userRes } = await client.auth.getUser();
        const uid = userRes.user?.id ?? null;

        const org = await insertOr<{ id: string }>("organizations", {
          name: input.orgName, type: input.orgType, plan: input.plan, billing_status: "trial",
        }, (r) => ({ id: r.id }));
        if (!org.ok || !org.data) return { ok: false, source: "supabase", orgId: null, error: org.error };
        const orgId = org.data.id;

        // Best-effort related rows (don't fail the whole setup if one is missing).
        if (uid) {
          await insertOr("organization_members", { organization_id: orgId, profile_id: uid, role_slug: "org_admin", status: "active" });
        }
        await insertOr("facilities", {
          organization_id: orgId, name: input.firstFacility.name, address: input.firstFacility.address,
          operating_hours: input.firstFacility.hours, pool_type: input.firstFacility.poolType,
          capacity: input.firstFacility.capacity, status: "open",
        });
        await insertOr("organization_subscriptions", {
          organization_id: orgId, plan_tier: input.plan, billing_status: "trial", billing_cycle: "monthly",
        });
        return { ok: true, source: "supabase", orgId, error: null };
      } catch (e: any) {
        return { ok: false, source: "supabase", orgId: null, error: e?.message ?? "Setup failed" };
      }
    },
  },

  // Mock-backed repos (read from bundled data; same pattern extends to supabase).
  lessons: { list: async (): Promise<RepoResult<typeof seedLessons>> => ({ data: seedLessons, source: "mock", error: null }) },
  members: { listHouseholds: async () => ({ data: seedHouseholds, source: "mock" as const, error: null }), list: async () => ({ data: seedMembers, source: "mock" as const, error: null }) },
  documents: { list: async () => ({ data: seedDocuments, source: "mock" as const, error: null }) },
  inspections: { list: async () => ({ data: seedInspections, source: "mock" as const, error: null }) },
  certifications: { list: async () => ({ data: seedCerts, source: "mock" as const, error: null }) },
};

/** Quick connectivity probe used by setup/health UIs. */
export async function pingSupabase(): Promise<boolean> {
  const client = db();
  if (!client) return false;
  try {
    const { error } = await client.from("organizations").select("id").limit(1);
    return !error || error.code === "PGRST205"; // reachable even if schema missing
  } catch {
    return false;
  }
}
