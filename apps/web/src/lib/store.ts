"use client";

import { create } from "zustand";
import {
  getFacility, getStaff, staffName, uid,
  type ChemicalLog, type ChecklistCompletion, type ID,
  type MaintenanceIssue, type Message, type MessageKind, type Notification, type PatronCount,
  type RequestStatus, type ShiftReport, type ShiftTradeRequest, type TimeClockEntry,
  type TimeOffRequest, type IssueStatus, type MessageTemplateKey, type SubmissionStatus,
  type OnboardingStepKey, type Shift, type ChecklistTemplate, type Facility, type Pool,
  channels as seedChannels, chemicalLogs as seedChem, checklistCompletions as seedChecklists,
  checklistTemplates as seedChecklistTemplates,
  maintenanceIssues as seedIssues, messages as seedMessages, notifications as seedNotifications,
  onboardingSubmissions as seedOnboarding, patronCounts as seedPatron, shiftReports as seedReports,
  shiftTradeRequests as seedTrades, shifts as seedShifts, timeClockEntries as seedClock, timeOffRequests as seedTimeOff,
  facilities as seedFacilities, pools as seedPools, DEFAULT_CHEMICAL_RANGES, flagOutOfRange,
  canCreateGroupChat, canSendDirectMessage, canToggleDirectMessages, canManageChatMembers,
  type Channel, type RoleSlug,
} from "@poolops/shared";
import type { ScheduleDraft } from "@poolops/scheduling";
import { repos, activeMode } from "./repos";

export interface ScheduleSettings {
  autoPostToAllTeam: boolean;
  allowStaffComments: boolean;
  notifyInApp: boolean;
  emailSms: boolean;
}

export interface PostOptions {
  template?: MessageTemplateKey;
  priority?: "normal" | "urgent";
  kind?: MessageKind;
  pinned?: boolean;
  linkUrl?: string;
}

const clone = <T,>(v: T): T =>
  typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v));

interface DemoState {
  /**
   * The tenant's facilities + pools live in the store (not just static seed data)
   * so a facility created on the Facilities screen round-trips to every other
   * screen — chem logs, checklists, schedules, shift reports, the switcher. EMPTY
   * for a real tenant until one is added; the demo tenant is seeded with samples.
   * (Root cause of the "created facility missing from Chemical Logs" bug — see
   * AUDIT.md.)
   */
  facilities: Facility[];
  pools: Pool[];
  /** Create a facility (+ a default Main Pool so chem logging works immediately). */
  addFacility: (input: Omit<Facility, "id">) => string;
  timeOff: TimeOffRequest[];
  trades: ShiftTradeRequest[];
  clock: TimeClockEntry[];
  issues: MaintenanceIssue[];
  chemicals: ChemicalLog[];
  messages: Message[];
  checklists: ChecklistCompletion[];
  /** Admin-created checklist templates. EMPTY for a real tenant until an admin
   *  creates one (or imports the examples); the demo tenant is seeded with samples. */
  checklistTemplates: ChecklistTemplate[];
  patron: PatronCount[];
  reports: ShiftReport[];
  notifications: Notification[];
  onboarding: typeof seedOnboarding;
  channels: typeof seedChannels;
  drafts: ScheduleDraft[];
  /** All live shifts (seeded + published). Mutable so assign/pick-up/trade work. */
  shifts: Shift[];
  scheduleSettings: ScheduleSettings;

  addDraft: (draft: ScheduleDraft) => void;
  removeDraft: (id: ID) => void;
  updateDraftShift: (draftId: ID, shiftId: ID, assignedStaffId: ID | null) => void;
  publishDraft: (draftId: ID, publishedBy: ID) => { assignedCount: number };
  setScheduleSetting: (key: keyof ScheduleSettings, value: boolean) => void;

  reviewTimeOff: (id: ID, status: RequestStatus, reviewer: ID) => void;
  reviewTrade: (id: ID, status: RequestStatus) => void;
  /** Staff creates a time-off request (starts pending). */
  addTimeOff: (req: { staffId: ID; startDate: string; endDate: string; reason: string; type: TimeOffRequest["type"] }) => void;
  /** Staff creates a shift swap / sub request (starts pending). */
  addTrade: (req: { shiftId: ID; requestedBy: ID; requestedTo: ID | null; reason: string }) => void;
  /** Assign or unassign a shift (manager action or trade approval). */
  assignShift: (shiftId: ID, staffId: ID | null) => void;
  /** Staff claims an open shift for themselves. No-op if already assigned. */
  pickUpShift: (shiftId: ID, staffId: ID) => void;
  toggleClock: (staffId: ID, facilityId: ID) => void;
  /** Add break minutes to the staff member's currently-active clock entry. */
  addBreak: (staffId: ID, minutes: number) => void;
  addIssue: (issue: Omit<MaintenanceIssue, "id" | "reportedAt">) => void;
  setIssueStatus: (id: ID, status: IssueStatus) => void;
  assignIssue: (id: ID, staffId: ID) => void;
  /** `enabledFields` (from the tenant's chemical config) restricts which fields can be
   *  flagged out of range — a field the tenant doesn't record never trips an alert. */
  addChemicalLog: (log: Omit<ChemicalLog, "id" | "recordedAt" | "outOfRange">, enabledFields?: readonly string[]) => string[];
  postMessage: (channelId: ID, senderId: ID, body: string, opts?: PostOptions) => void;
  togglePinMessage: (id: ID) => void;

  /* ---- Team chat: group chats, DMs, membership, and the org DM toggle ---- */
  /** Org-wide switch: when true, front-line staff can't start/send DMs (managers still can). */
  dmsDisabled: boolean;
  /** Flip the org DM toggle. Enforced: only Super Admin / Pool Manager. Returns success. */
  setDmsDisabled: (value: boolean, actorRole: RoleSlug | null) => boolean;
  /** Create a group chat with a custom member set. Enforced: manager tier and up.
   *  The creator is always a member. Returns the new channel id, or an error. */
  createGroupChat: (input: {
    name: string; description?: string; memberIds: ID[];
    createdBy: ID; creatorRole: RoleSlug | null; organizationId?: ID;
  }) => { ok: true; id: string } | { ok: false; error: string };
  /** Start (or reuse) a 1:1 DM between two staff. Enforced: DMs enabled or the sender is a manager. */
  createDirectChat: (input: {
    fromStaffId: ID; toStaffId: ID; senderRole: RoleSlug | null; organizationId?: ID;
  }) => { ok: true; id: string } | { ok: false; error: string };
  /** Add a member to a group chat. Enforced: creator or manager. */
  addChannelMember: (channelId: ID, staffId: ID, actor: { staffId: ID | null; role: RoleSlug | null }) => boolean;
  /** Remove a member from a group chat. Enforced: creator or manager (never the creator themselves). */
  removeChannelMember: (channelId: ID, staffId: ID, actor: { staffId: ID | null; role: RoleSlug | null }) => boolean;
  /** Mark a channel read (clears its unread count). */
  markChannelRead: (channelId: ID) => void;
  completeChecklist: (c: Omit<ChecklistCompletion, "id" | "completedAt">) => void;
  /** Admin CRUD for checklist templates (create/edit/archive/import examples). */
  addChecklistTemplate: (t: Omit<ChecklistTemplate, "id">) => string;
  updateChecklistTemplate: (id: ID, patch: Partial<Omit<ChecklistTemplate, "id">>) => void;
  removeChecklistTemplate: (id: ID) => void;
  /** "Start from example" — load the sample templates into a real tenant on demand. */
  importExampleChecklists: () => void;
  addPatronCount: (facilityId: ID, timeSlot: string, count: number, by: ID) => void;
  addReport: (r: Omit<ShiftReport, "id">) => void;
  /** Manager review of a shift report (mark reviewed / flag for follow-up). */
  setReportStatus: (id: ID, status: ShiftReport["reviewStatus"], managerNotes?: string) => void;
  markNotificationsRead: () => void;
  setOnboardingStep: (staffId: ID, step: OnboardingStepKey, status: SubmissionStatus) => void;
  /** Replace store slices with live Supabase data (used by SupabaseHydrator). */
  hydrate: (partial: Partial<Pick<DemoState,
    "messages" | "channels" | "chemicals" | "issues" | "notifications" | "clock" | "timeOff" | "trades" | "shifts">>) => void;
  /** True once the bundled demo dataset has been loaded (demo tenant only). */
  seeded: boolean;
  /**
   * Populate the store with the bundled demo dataset. Called ONLY in the demo
   * tenant (see DemoSeeder). Real tenants keep every slice empty so nothing
   * demo/sample ever renders in a real facility's views.
   */
  seedDemo: () => void;
}

/** The bundled demo dataset — loaded into the store ONLY for the demo tenant. */
function demoSeed() {
  return {
    timeOff: clone(seedTimeOff), trades: clone(seedTrades), clock: clone(seedClock),
    issues: clone(seedIssues), chemicals: clone(seedChem), messages: clone(seedMessages),
    checklists: clone(seedChecklists), checklistTemplates: clone(seedChecklistTemplates),
    patron: clone(seedPatron), reports: clone(seedReports),
    notifications: clone(seedNotifications), onboarding: clone(seedOnboarding),
    channels: clone(seedChannels), shifts: clone(seedShifts),
    facilities: clone(seedFacilities), pools: clone(seedPools),
  };
}

export const useDemo = create<DemoState>((set, get) => ({
  // EMPTY by default — a real tenant shows empty states, never demo data. The demo
  // tenant loads the bundled dataset via seedDemo() (see DemoSeeder).
  timeOff: [],
  trades: [],
  clock: [],
  issues: [],
  chemicals: [],
  messages: [],
  checklists: [],
  checklistTemplates: [],
  patron: [],
  reports: [],
  notifications: [],
  onboarding: [],
  channels: [],
  drafts: [],
  shifts: [],
  scheduleSettings: { autoPostToAllTeam: true, allowStaffComments: true, notifyInApp: true, emailSms: false },
  dmsDisabled: false,
  facilities: [],
  pools: [],
  seeded: false,

  seedDemo: () => set((s) => (s.seeded ? {} : { ...demoSeed(), seeded: true })),

  addFacility: (input) => {
    const id = uid("fac");
    const pool: Pool = {
      id: uid("pool"), facilityId: id, name: "Main Pool",
      poolType: input.poolType ?? "leisure", volumeGallons: 100000, maxDepthFt: 8,
    };
    set((s) => ({
      facilities: [...s.facilities, { ...input, id }],
      pools: [...s.pools, pool],
    }));
    return id;
  },

  addDraft: (draft) => set((s) => ({ drafts: [draft, ...s.drafts.filter((d) => d.id !== draft.id)] })),

  removeDraft: (id) => set((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),

  updateDraftShift: (draftId, shiftId, assignedStaffId) =>
    set((s) => ({
      drafts: s.drafts.map((d) =>
        d.id !== draftId ? d : {
          ...d,
          shifts: d.shifts.map((sh) =>
            sh.id === shiftId ? { ...sh, assignedStaffId, isOpenShift: assignedStaffId === null } : sh,
          ),
        },
      ),
    })),

  publishDraft: (draftId, publishedBy) => {
    let assignedCount = 0;
    set((s) => {
      const draft = s.drafts.find((d) => d.id === draftId);
      if (!draft) return {};
      const assigned = draft.shifts.filter((sh) => sh.assignedStaffId);
      assignedCount = assigned.length;
      const newShifts: Shift[] = draft.shifts.map((sh) => ({
        id: uid("shift"), facilityId: sh.facilityId, position: sh.position, date: sh.date,
        start: sh.start, end: sh.end, assignedStaffId: sh.assignedStaffId,
        status: sh.assignedStaffId ? "published" : "open",
      }));
      const settings = s.scheduleSettings;
      const messages = [...s.messages];
      if (settings.autoPostToAllTeam) {
        messages.push({
          id: uid("msg"), channelId: "ch_all", senderId: publishedBy,
          body: `📅 Next week's schedule has been published. Please review your assigned shifts in My Schedule. ${draft.unfilledCount > 0 ? `${draft.unfilledCount} open shift(s) are available to pick up.` : ""}`.trim(),
          sentAt: new Date().toISOString(), pinned: true, priority: "normal",
          kind: "schedule_publish", linkUrl: "/schedule",
        });
      }
      const staffIds = Array.from(new Set(assigned.map((sh) => sh.assignedStaffId!)));
      const notifications = settings.notifyInApp
        ? [
            ...staffIds.map((sid) => ({
              id: uid("ntf"), kind: "system" as const, title: "New schedule published",
              body: `Your shifts for the week of ${draft.weekStart} are ready. Tap to view.`,
              at: new Date().toISOString(), read: false, href: "/schedule",
            })),
            ...s.notifications,
          ]
        : s.notifications;
      return {
        drafts: s.drafts.map((d) => (d.id === draftId ? { ...d, status: "published" } : d)),
        shifts: [...newShifts, ...s.shifts],
        messages, notifications,
      };
    });
    return { assignedCount };
  },

  setScheduleSetting: (key, value) =>
    set((s) => ({ scheduleSettings: { ...s.scheduleSettings, [key]: value } })),

  reviewTimeOff: (id, status, reviewer) => {
    set((s) => ({
      timeOff: s.timeOff.map((r) => (r.id === id ? { ...r, status, reviewedBy: reviewer } : r)),
    }));
    if (activeMode() === "supabase") void repos.timeOff.review(id, status, reviewer);
  },

  /**
   * Approve/deny a swap. On approval the shift is reassigned to `requestedTo`
   * (a specific sub) or opened up for anyone to pick up (an open sub request).
   */
  reviewTrade: (id, status) => {
    const trade = get().trades.find((t) => t.id === id);
    const reassign = trade && status === "approved"
      ? { shiftId: trade.shiftId, assignedStaffId: trade.requestedTo ?? null }
      : null;
    set((s) => ({
      trades: s.trades.map((t) => (t.id === id ? { ...t, status } : t)),
      shifts: reassign
        ? s.shifts.map((sh) => (sh.id === reassign.shiftId ? { ...sh, assignedStaffId: reassign.assignedStaffId, status: reassign.assignedStaffId ? "assigned" : "open" } : sh))
        : s.shifts,
    }));
    if (activeMode() === "supabase") {
      void repos.trades.review(id, status);
      if (reassign) void repos.scheduling.updateShift(reassign.shiftId, { assignedStaffId: reassign.assignedStaffId, status: reassign.assignedStaffId ? "assigned" : "open" });
    }
  },

  addTimeOff: (req) => {
    const item: TimeOffRequest = {
      id: uid("to"), staffId: req.staffId, startDate: req.startDate, endDate: req.endDate,
      reason: req.reason, type: req.type, status: "pending", submittedAt: new Date().toISOString(),
    };
    set((s) => ({ timeOff: [item, ...s.timeOff] }));
    if (activeMode() === "supabase") {
      void repos.timeOff.create({ staffId: req.staffId, startDate: req.startDate, endDate: req.endDate, reason: req.reason, type: req.type });
    }
  },

  addTrade: (req) => {
    const item: ShiftTradeRequest = {
      id: uid("tr"), shiftId: req.shiftId, requestedBy: req.requestedBy, requestedTo: req.requestedTo,
      reason: req.reason, status: "pending", submittedAt: new Date().toISOString(),
    };
    set((s) => ({ trades: [item, ...s.trades] }));
    if (activeMode() === "supabase") {
      void repos.trades.create({ shiftId: req.shiftId, requestedBy: req.requestedBy, requestedTo: req.requestedTo, reason: req.reason });
    }
  },

  assignShift: (shiftId, staffId) => {
    set((s) => ({
      shifts: s.shifts.map((sh) => (sh.id === shiftId ? { ...sh, assignedStaffId: staffId, status: staffId ? "assigned" : "open" } : sh)),
    }));
    if (activeMode() === "supabase") void repos.scheduling.updateShift(shiftId, { assignedStaffId: staffId, status: staffId ? "assigned" : "open" });
  },

  pickUpShift: (shiftId, staffId) => {
    let claimed = false;
    set((s) => ({
      shifts: s.shifts.map((sh) => {
        if (sh.id === shiftId && !sh.assignedStaffId) { claimed = true; return { ...sh, assignedStaffId: staffId, status: "assigned" }; }
        return sh;
      }),
    }));
    if (claimed && activeMode() === "supabase") void repos.scheduling.updateShift(shiftId, { assignedStaffId: staffId, status: "assigned" });
  },

  toggleClock: (staffId, facilityId) => {
    const existing = get().clock.find(
      (e) => e.staffId === staffId && (e.status === "clocked_in" || e.status === "late"),
    );
    const nowIso = new Date().toISOString();
    if (existing) {
      // Clock out: close the active entry.
      set((s) => ({
        clock: s.clock.map((e) => (e.id === existing.id ? { ...e, clockOut: nowIso, status: "clocked_out" } : e)),
      }));
      if (activeMode() === "supabase") void repos.timeClock.update(existing.id, { clock_out: nowIso, status: "clocked_out" });
    } else {
      // Clock in: open a new entry.
      const entry: TimeClockEntry = {
        id: uid("tc"), staffId, facilityId, clockIn: nowIso,
        clockOut: null, breakMinutes: 0, status: "clocked_in", flagged: false,
      };
      set((s) => ({ clock: [entry, ...s.clock] }));
      if (activeMode() === "supabase") void repos.timeClock.create({
        staff_id: staffId, facility_id: facilityId, clock_in: nowIso,
        break_minutes: 0, status: "clocked_in", flagged: false,
      });
    }
  },

  addBreak: (staffId, minutes) => {
    const existing = get().clock.find(
      (e) => e.staffId === staffId && (e.status === "clocked_in" || e.status === "late"),
    );
    if (!existing) return;
    const total = existing.breakMinutes + minutes;
    set((s) => ({ clock: s.clock.map((e) => (e.id === existing.id ? { ...e, breakMinutes: total } : e)) }));
    if (activeMode() === "supabase") void repos.timeClock.update(existing.id, { break_minutes: total });
  },

  addIssue: (issue) => {
    set((s) => ({
      issues: [{ ...issue, id: uid("mi"), reportedAt: new Date().toISOString() }, ...s.issues],
    }));
    if (activeMode() === "supabase") {
      void repos.maintenance.create({
        facility_id: issue.facilityId, area: issue.area, title: issue.title, description: issue.description,
        priority: issue.priority, status: issue.status, reported_by: issue.reportedBy,
        assigned_to: issue.assignedTo, due_date: issue.dueDate ?? null,
      });
    }
  },

  setIssueStatus: (id, status) => {
    set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, status } : i)) }));
    if (activeMode() === "supabase") void repos.maintenance.update(id, { status });
  },

  assignIssue: (id, staffId) => {
    set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, assignedTo: staffId } : i)) }));
    if (activeMode() === "supabase") void repos.maintenance.update(id, { assigned_to: staffId });
  },

  addChemicalLog: (log, enabledFields) => {
    const values = {
      freeChlorine: log.freeChlorine, combinedChlorine: log.combinedChlorine, ph: log.ph,
      alkalinity: log.alkalinity, calciumHardness: log.calciumHardness,
      cyanuricAcid: log.cyanuricAcid, waterTemp: log.waterTemp,
    };
    // Resolve ranges from the tenant's facility (store first, so a created facility
    // works), then the static seed, then defaults — so out-of-range detection always
    // runs, even for a facility added at runtime.
    const facility = get().facilities.find((f) => f.id === log.facilityId) ?? getFacility(log.facilityId);
    const flags = flagOutOfRange(facility?.chemicalRanges ?? DEFAULT_CHEMICAL_RANGES, values, enabledFields);
    const nowIso = new Date().toISOString();
    // The reading's taken-at time (defaults to now, user may backdate); recordedAt is
    // the audit/created time and is always "now".
    const takenAt = log.takenAt ?? nowIso;
    set((s) => ({
      chemicals: [
        { ...log, takenAt, id: uid("chem"), recordedAt: nowIso, outOfRange: flags },
        ...s.chemicals,
      ],
    }));
    if (activeMode() === "supabase") {
      void repos.chemicals.create({
        facility_id: log.facilityId, pool_id: log.poolId, recorded_by: log.recordedBy,
        free_chlorine: log.freeChlorine, combined_chlorine: log.combinedChlorine, ph: log.ph,
        alkalinity: log.alkalinity, calcium_hardness: log.calciumHardness, cyanuric_acid: log.cyanuricAcid,
        water_temp: log.waterTemp, notes: log.notes ?? null, out_of_range: flags, taken_at: takenAt,
      });
    }
    return flags;
  },

  postMessage: (channelId, senderId, body, opts = {}) => {
    // Membership guard: only a member may post to a group chat / DM. Announcement
    // channels are open (posting there is gated by chat.announce in the UI). Mirrors
    // the RLS `messages_post` check so the store behaves like the backend.
    const ch = get().channels.find((c) => c.id === channelId);
    if (ch && (ch.chatType === "group" || ch.chatType === "dm") && !ch.memberIds?.includes(senderId)) return;
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: uid("msg"), channelId, senderId, body, sentAt: new Date().toISOString(),
          pinned: opts.pinned ?? false, template: opts.template,
          priority: opts.priority ?? "normal", kind: opts.kind ?? "message", linkUrl: opts.linkUrl,
        },
      ],
    }));
    if (activeMode() === "supabase") {
      void repos.chat.postMessage(channelId, senderId, body, {
        pinned: opts.pinned, priority: opts.priority, kind: opts.kind, linkUrl: opts.linkUrl, template: opts.template,
      });
    }
  },

  togglePinMessage: (id) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)) })),

  setDmsDisabled: (value, actorRole) => {
    if (!canToggleDirectMessages(actorRole)) return false; // Super Admin / Pool Manager only
    set({ dmsDisabled: value });
    return true;
  },

  createGroupChat: ({ name, description, memberIds, createdBy, creatorRole, organizationId }) => {
    // Backend-equivalent guard: front-line staff can NEVER create a group chat.
    if (!canCreateGroupChat(creatorRole)) return { ok: false as const, error: "Only managers and admins can create group chats." };
    const trimmed = name.trim();
    if (!trimmed) return { ok: false as const, error: "Give the chat a name." };
    // The creator is always a member; de-dupe the roster.
    const members = Array.from(new Set([createdBy, ...memberIds])).filter(Boolean);
    const id = uid("ch");
    const channel: Channel = {
      id, name: trimmed, kind: "group", chatType: "group",
      description: description?.trim() || `${members.length} members`,
      createdBy, memberIds: members, organizationId, unread: 0,
    };
    set((s) => ({ channels: [channel, ...s.channels] }));
    if (activeMode() === "supabase") void repos.chat.createGroupChat?.({ id, name: trimmed, description, memberIds: members, createdBy, organizationId });
    return { ok: true as const, id };
  },

  createDirectChat: ({ fromStaffId, toStaffId, senderRole, organizationId }) => {
    if (fromStaffId === toStaffId) return { ok: false as const, error: "You can't DM yourself." };
    // DMs are open by default; when disabled org-wide only managers may still start one.
    if (!canSendDirectMessage(senderRole, get().dmsDisabled)) {
      return { ok: false as const, error: "Direct messages are disabled for your account." };
    }
    // Reuse an existing DM between exactly these two people (tenant-scoped).
    const pair = [fromStaffId, toStaffId].sort();
    const existing = get().channels.find((c) =>
      c.chatType === "dm" && c.organizationId === organizationId &&
      (c.memberIds ?? []).slice().sort().join("|") === pair.join("|"));
    if (existing) return { ok: true as const, id: existing.id };
    const other = getStaff(toStaffId);
    const id = uid("dm");
    const channel: Channel = {
      id, name: other ? `${other.firstName} ${other.lastName}` : "Direct message",
      kind: "dm", chatType: "dm", description: "Direct message",
      createdBy: fromStaffId, memberIds: [fromStaffId, toStaffId], organizationId, unread: 0,
    };
    set((s) => ({ channels: [channel, ...s.channels] }));
    if (activeMode() === "supabase") void repos.chat.createDirectChat?.({ id, fromStaffId, toStaffId, organizationId });
    return { ok: true as const, id };
  },

  addChannelMember: (channelId, staffId, actor) => {
    const ch = get().channels.find((c) => c.id === channelId);
    if (!ch || !canManageChatMembers(ch, { staffId: actor.staffId, role: actor.role })) return false;
    set((s) => ({
      channels: s.channels.map((c) =>
        c.id === channelId ? { ...c, memberIds: Array.from(new Set([...(c.memberIds ?? []), staffId])) } : c),
    }));
    if (activeMode() === "supabase") void repos.chat.addChannelMember?.(channelId, staffId);
    return true;
  },

  removeChannelMember: (channelId, staffId, actor) => {
    const ch = get().channels.find((c) => c.id === channelId);
    if (!ch || !canManageChatMembers(ch, { staffId: actor.staffId, role: actor.role })) return false;
    if (ch.createdBy === staffId) return false; // don't strip the creator
    set((s) => ({
      channels: s.channels.map((c) =>
        c.id === channelId ? { ...c, memberIds: (c.memberIds ?? []).filter((m) => m !== staffId) } : c),
    }));
    if (activeMode() === "supabase") void repos.chat.removeChannelMember?.(channelId, staffId);
    return true;
  },

  markChannelRead: (channelId) =>
    set((s) => ({ channels: s.channels.map((c) => (c.id === channelId ? { ...c, unread: 0 } : c)) })),

  completeChecklist: (c) =>
    set((s) => ({
      checklists: [{ ...c, id: uid("clc"), completedAt: new Date().toISOString() }, ...s.checklists],
    })),

  addChecklistTemplate: (t) => {
    const id = uid("cl");
    set((s) => ({ checklistTemplates: [{ ...t, id }, ...s.checklistTemplates] }));
    return id;
  },
  updateChecklistTemplate: (id, patch) =>
    set((s) => ({ checklistTemplates: s.checklistTemplates.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  removeChecklistTemplate: (id) =>
    set((s) => ({ checklistTemplates: s.checklistTemplates.filter((t) => t.id !== id) })),
  importExampleChecklists: () =>
    set((s) => {
      // Only add examples that aren't already present (idempotent), re-id'd for this
      // tenant. Clear facilityIds — the sample data points at DEMO facilities that
      // don't exist here; an empty list means "applies to all of this tenant's
      // facilities" (see the editor's "none = all facilities").
      const have = new Set(s.checklistTemplates.map((t) => t.name.toLowerCase()));
      const add = clone(seedChecklistTemplates)
        .filter((t) => !have.has(t.name.toLowerCase()))
        .map((t) => ({ ...t, id: uid("cl"), facilityIds: [] }));
      return { checklistTemplates: [...add, ...s.checklistTemplates] };
    }),

  addPatronCount: (facilityId, timeSlot, count, by) =>
    set((s) => ({
      patron: [
        { id: uid("pc"), facilityId, recordedAt: new Date().toISOString(), recordedBy: by, timeSlot, count },
        ...s.patron,
      ],
    })),

  addReport: (r) => set((s) => ({ reports: [{ ...r, id: uid("sr") }, ...s.reports] })),

  setReportStatus: (id, status, managerNotes) =>
    set((s) => ({ reports: s.reports.map((r) => (r.id === id ? { ...r, reviewStatus: status, ...(managerNotes !== undefined ? { managerNotes } : {}) } : r)) })),

  markNotificationsRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

  setOnboardingStep: (staffId, step, status) =>
    set((s) => {
      const idx = s.onboarding.findIndex((o) => o.staffId === staffId && o.step === step);
      const submittedAt = status === "submitted" || status === "approved" ? new Date().toISOString() : undefined;
      if (idx >= 0) {
        const next = [...s.onboarding];
        next[idx] = { ...next[idx], status, submittedAt: submittedAt ?? next[idx].submittedAt };
        return { onboarding: next };
      }
      return {
        onboarding: [...s.onboarding, { id: uid("ob"), staffId, step, status, submittedAt }],
      };
    }),

  hydrate: (partial) => set((s) => ({ ...s, ...partial })),
}));
