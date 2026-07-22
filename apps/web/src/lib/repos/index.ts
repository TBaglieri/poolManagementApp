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
  timeOffRequests as seedTimeOff, shifts as seedShifts, lessonClasses as seedLessons,
  households as seedHouseholds, members as seedMembers, documents as seedDocuments,
  inspectionResults as seedInspections, staffCertifications as seedCerts,
  SUBSCRIPTION_PLANS, SETUP_PACKAGES,
  type Facility, type StaffProfile, type Organization, type Channel, type Message,
  type Notification, type ChemicalLog, type MaintenanceIssue, type TimeClockEntry,
  type TimeOffRequest, type Shift,
} from "@poolops/shared";
import { activeMode, selectOr, insertOr, db, type RepoResult } from "./db";

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
  },

  facilities: {
    list: () => selectOr<any, Facility>("facilities", seedFacilities, mapFacility),
  },

  staff: {
    list: () => selectOr<any, StaffProfile>("staff_profiles", seedStaff, (r) => ({
      ...seedStaff[0], id: s(r.id), orgId: s(r.organization_id), firstName: s(r.first_name ?? seedStaff[0].firstName),
      lastName: s(r.last_name ?? ""), title: s(r.title), primaryRole: r.primary_role ?? "lifeguard",
      roles: arr(r.roles), homeFacilityId: s(r.home_facility_id), facilityIds: arr(r.facility_ids),
      age: n(r.age), isMinor: b(r.is_minor), preferredHoursPerWeek: n(r.preferred_hours_per_week),
      onboardingComplete: n(r.onboarding_complete),
    })),
  },

  chat: {
    listChannels: () => selectOr<any, Channel>("channels", seedChannels, mapChannel),
    listMessages: () => selectOr<any, Message>("messages", seedMessages, mapMessage, (q) => q.order("created_at", { ascending: true })),
    async postMessage(channelId: string, senderId: string, body: string, opts: Partial<Message> = {}) {
      return insertOr<Message>("messages", {
        channel_id: channelId, sender_id: senderId, body,
        pinned: opts.pinned ?? false, priority: opts.priority ?? "normal",
        kind: opts.kind ?? "message", template: opts.template ?? null, link_url: opts.linkUrl ?? null,
      }, mapMessage);
    },
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
  },

  timeClock: {
    list: () => selectOr<any, TimeClockEntry>("time_clock_entries", seedClock, mapClock),
    create: (payload: Record<string, unknown>) => insertOr<TimeClockEntry>("time_clock_entries", payload, mapClock),
  },

  timeOff: {
    listApproved: () => selectOr<any, TimeOffRequest>("time_off_requests", seedTimeOff.filter((t) => t.status === "approved"), (r) => ({
      id: s(r.id), staffId: s(r.staff_id), startDate: s(r.start_date), endDate: s(r.end_date),
      reason: s(r.reason), type: r.type ?? "vacation", status: r.status ?? "approved",
      submittedAt: s(r.created_at), reviewedBy: r.reviewed_by ?? undefined,
    }), (q) => q.eq("status", "approved")),
  },

  scheduling: {
    listShifts: () => selectOr<any, Shift>("shifts", seedShifts, (r) => ({
      id: s(r.id), facilityId: s(r.facility_id), position: r.position ?? "lifeguard", date: s(r.shift_date ?? r.date),
      start: s(r.start_time ?? r.start), end: s(r.end_time ?? r.end), assignedStaffId: r.assigned_staff_id ?? null,
      status: r.status ?? "published", notes: r.notes ?? undefined,
    })),
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

  billing: {
    async subscription(): Promise<RepoResult<{ tier: string; status: string } | null>> {
      if (activeMode() !== "supabase") return { data: { tier: "medium", status: "active" }, source: "mock", error: null };
      const r = await selectOr<any, { tier: string; status: string }>("organization_subscriptions",
        [{ tier: "medium", status: "active" }], (row) => ({ tier: s(row.plan_tier), status: s(row.billing_status) }), (q) => q.limit(1));
      return { data: r.data[0] ?? null, source: r.source, error: r.error };
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
