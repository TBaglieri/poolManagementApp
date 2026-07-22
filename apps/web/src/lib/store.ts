"use client";

import { create } from "zustand";
import {
  getFacility, staffName, uid,
  type ChemicalLog, type ChemicalRange, type ChecklistCompletion, type ID,
  type MaintenanceIssue, type Message, type MessageKind, type Notification, type PatronCount,
  type RequestStatus, type ShiftReport, type ShiftTradeRequest, type TimeClockEntry,
  type TimeOffRequest, type IssueStatus, type MessageTemplateKey, type SubmissionStatus,
  type OnboardingStepKey, type Shift,
  channels as seedChannels, chemicalLogs as seedChem, checklistCompletions as seedChecklists,
  maintenanceIssues as seedIssues, messages as seedMessages, notifications as seedNotifications,
  onboardingSubmissions as seedOnboarding, patronCounts as seedPatron, shiftReports as seedReports,
  shiftTradeRequests as seedTrades, shifts as seedShifts, timeClockEntries as seedClock, timeOffRequests as seedTimeOff,
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

function chemFlags(facilityId: ID, values: Record<string, number>): string[] {
  const f = getFacility(facilityId);
  if (!f) return [];
  const r = f.chemicalRanges;
  return (Object.keys(r) as (keyof ChemicalRange)[]).filter((k) => {
    const [min, max] = r[k];
    const v = values[k];
    return typeof v === "number" && (v < min || v > max);
  });
}

interface DemoState {
  timeOff: TimeOffRequest[];
  trades: ShiftTradeRequest[];
  clock: TimeClockEntry[];
  issues: MaintenanceIssue[];
  chemicals: ChemicalLog[];
  messages: Message[];
  checklists: ChecklistCompletion[];
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
  addIssue: (issue: Omit<MaintenanceIssue, "id" | "reportedAt">) => void;
  setIssueStatus: (id: ID, status: IssueStatus) => void;
  assignIssue: (id: ID, staffId: ID) => void;
  addChemicalLog: (log: Omit<ChemicalLog, "id" | "recordedAt" | "outOfRange">) => string[];
  postMessage: (channelId: ID, senderId: ID, body: string, opts?: PostOptions) => void;
  togglePinMessage: (id: ID) => void;
  completeChecklist: (c: Omit<ChecklistCompletion, "id" | "completedAt">) => void;
  addPatronCount: (facilityId: ID, timeSlot: string, count: number, by: ID) => void;
  addReport: (r: Omit<ShiftReport, "id">) => void;
  markNotificationsRead: () => void;
  setOnboardingStep: (staffId: ID, step: OnboardingStepKey, status: SubmissionStatus) => void;
  /** Replace store slices with live Supabase data (used by SupabaseHydrator). */
  hydrate: (partial: Partial<Pick<DemoState,
    "messages" | "channels" | "chemicals" | "issues" | "notifications" | "clock" | "timeOff" | "trades" | "shifts">>) => void;
}

export const useDemo = create<DemoState>((set, get) => ({
  timeOff: clone(seedTimeOff),
  trades: clone(seedTrades),
  clock: clone(seedClock),
  issues: clone(seedIssues),
  chemicals: clone(seedChem),
  messages: clone(seedMessages),
  checklists: clone(seedChecklists),
  patron: clone(seedPatron),
  reports: clone(seedReports),
  notifications: clone(seedNotifications),
  onboarding: clone(seedOnboarding),
  channels: clone(seedChannels),
  drafts: [],
  shifts: clone(seedShifts),
  scheduleSettings: { autoPostToAllTeam: true, allowStaffComments: true, notifyInApp: true, emailSms: false },

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
    const wasClockedIn = get().clock.some(
      (e) => e.staffId === staffId && (e.status === "clocked_in" || e.status === "late"),
    );
    set((s) => {
      const existing = s.clock.find(
        (e) => e.staffId === staffId && (e.status === "clocked_in" || e.status === "late"),
      );
      if (existing) {
        return {
          clock: s.clock.map((e) =>
            e.id === existing.id ? { ...e, clockOut: new Date().toISOString(), status: "clocked_out" } : e,
          ),
        };
      }
      const entry: TimeClockEntry = {
        id: uid("tc"), staffId, facilityId, clockIn: new Date().toISOString(),
        clockOut: null, breakMinutes: 0, status: "clocked_in", flagged: false,
      };
      return { clock: [entry, ...s.clock] };
    });
    // Persist a new clock-in to Supabase (clock-out updates are left to a future sync).
    if (!wasClockedIn && activeMode() === "supabase") {
      void repos.timeClock.create({
        staff_id: staffId, facility_id: facilityId, clock_in: new Date().toISOString(),
        break_minutes: 0, status: "clocked_in", flagged: false,
      });
    }
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

  setIssueStatus: (id, status) =>
    set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, status } : i)) })),

  assignIssue: (id, staffId) =>
    set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, assignedTo: staffId } : i)) })),

  addChemicalLog: (log) => {
    const values = {
      freeChlorine: log.freeChlorine, combinedChlorine: log.combinedChlorine, ph: log.ph,
      alkalinity: log.alkalinity, calciumHardness: log.calciumHardness,
      cyanuricAcid: log.cyanuricAcid, waterTemp: log.waterTemp,
    };
    const flags = chemFlags(log.facilityId, values);
    set((s) => ({
      chemicals: [
        { ...log, id: uid("chem"), recordedAt: new Date().toISOString(), outOfRange: flags },
        ...s.chemicals,
      ],
    }));
    if (activeMode() === "supabase") {
      void repos.chemicals.create({
        facility_id: log.facilityId, pool_id: log.poolId, recorded_by: log.recordedBy,
        free_chlorine: log.freeChlorine, combined_chlorine: log.combinedChlorine, ph: log.ph,
        alkalinity: log.alkalinity, calcium_hardness: log.calciumHardness, cyanuric_acid: log.cyanuricAcid,
        water_temp: log.waterTemp, notes: log.notes ?? null, out_of_range: flags,
      });
    }
    return flags;
  },

  postMessage: (channelId, senderId, body, opts = {}) => {
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

  completeChecklist: (c) =>
    set((s) => ({
      checklists: [{ ...c, id: uid("clc"), completedAt: new Date().toISOString() }, ...s.checklists],
    })),

  addPatronCount: (facilityId, timeSlot, count, by) =>
    set((s) => ({
      patron: [
        { id: uid("pc"), facilityId, recordedAt: new Date().toISOString(), recordedBy: by, timeSlot, count },
        ...s.patron,
      ],
    })),

  addReport: (r) => set((s) => ({ reports: [{ ...r, id: uid("sr") }, ...s.reports] })),

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
