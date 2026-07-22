/**
 * Module registry — the single source of truth for the feature-flag system.
 *
 * Every major capability is a module that a tenant can enable or disable. A
 * module declares the nav hrefs (routes) it owns, the permissions it needs, and
 * any sub-features. Nav filtering, server-side route gating (middleware), and the
 * admin toggle UI all derive from this array — add a capability by adding one
 * entry here, not by editing fifteen files.
 */
import type { PermissionKey } from "../types";

export type ModuleId =
  | "dashboard" | "scheduling" | "timeclock" | "staff" | "onboarding"
  | "certifications" | "facilities" | "chemicals" | "checklists" | "inspections"
  | "maintenance" | "shiftReports" | "patronCounts" | "lessons" | "members"
  | "reservations" | "guestPasses" | "chat" | "documents" | "payroll"
  | "reports" | "community" | "billing" | "settings";

export interface ModuleSubFeature {
  id: string;
  label: string;
  defaultEnabled: boolean;
}

export interface AppModule {
  id: ModuleId;
  label: string;
  description: string;
  /** Route prefixes this module owns; used for nav filtering + route gating. */
  navHrefs: string[];
  /** Any-of permissions a role needs to see the module (informational/documentation). */
  permissions: PermissionKey[];
  /** Core modules can never be disabled (the app would break without them). */
  core?: boolean;
  defaultEnabled: boolean;
  /** Declared in the registry so the flag system is complete, but no UI ships yet. */
  comingSoon?: boolean;
  subFeatures?: ModuleSubFeature[];
  group: string;
}

export const MODULES: AppModule[] = [
  { id: "dashboard", label: "Dashboard", description: "Role-aware overview and daily summary.", navHrefs: ["/dashboard"], permissions: ["dashboard.view"], core: true, defaultEnabled: true, group: "Core" },

  { id: "scheduling", label: "Scheduling & Shifts", description: "Staff schedules, auto-builder, drafts, shift swaps and pick-ups.", navHrefs: ["/schedule"], permissions: ["schedule.view", "schedule.self"], defaultEnabled: true, group: "Team",
    subFeatures: [
      { id: "autoBuilder", label: "Auto schedule builder", defaultEnabled: true },
      { id: "shiftSwaps", label: "Shift swaps & pick-ups", defaultEnabled: true },
    ] },
  { id: "timeclock", label: "Time Clock", description: "Clock in/out, breaks, missed-punch alerts.", navHrefs: ["/time-clock"], permissions: ["timeclock.self", "timeclock.manage"], defaultEnabled: true, group: "Team" },
  { id: "staff", label: "Staff Directory", description: "Staff profiles, roles, and status.", navHrefs: ["/staff"], permissions: ["staff.view"], defaultEnabled: true, group: "Team" },
  { id: "onboarding", label: "Onboarding", description: "New-hire onboarding tasks and document collection.", navHrefs: ["/onboarding"], permissions: ["onboarding.view", "onboarding.self"], defaultEnabled: true, group: "Team" },
  { id: "certifications", label: "Certifications", description: "Certification tracking and expiry reminders.", navHrefs: ["/certifications"], permissions: ["certifications.view"], defaultEnabled: true, group: "Team" },

  { id: "facilities", label: "Facilities", description: "Facilities and pools directory.", navHrefs: ["/facilities"], permissions: ["facilities.view"], defaultEnabled: true, group: "Operations" },
  { id: "chemicals", label: "Chemical Logs", description: "Water chemistry logging, target ranges, and compliance history.", navHrefs: ["/chemicals"], permissions: ["chemicals.view"], defaultEnabled: true, group: "Operations" },
  { id: "checklists", label: "Checklists", description: "Opening / closing and safety checklists.", navHrefs: ["/checklists"], permissions: ["checklists.view", "checklists.complete"], defaultEnabled: true, group: "Operations" },
  { id: "inspections", label: "Inspections", description: "Equipment inspections and compliance.", navHrefs: ["/inspections"], permissions: ["inspections.view"], defaultEnabled: true, group: "Operations" },
  { id: "maintenance", label: "Maintenance & Incidents", description: "Maintenance issues and incident reporting board.", navHrefs: ["/maintenance"], permissions: ["maintenance.view", "maintenance.report"], defaultEnabled: true, group: "Operations" },
  { id: "shiftReports", label: "Shift Reports", description: "End-of-shift reports and manager review.", navHrefs: ["/shift-reports"], permissions: ["shiftreports.view", "shiftreports.submit"], defaultEnabled: true, group: "Operations" },
  { id: "patronCounts", label: "Patron Counts", description: "Bather-load and capacity counts.", navHrefs: ["/patron-counts"], permissions: ["patroncounts.view", "patroncounts.log"], defaultEnabled: true, group: "Operations" },

  { id: "lessons", label: "Swim Lessons", description: "Class schedules, rosters, and attendance.", navHrefs: ["/lessons"], permissions: ["lessons.view"], defaultEnabled: true, group: "Programs" },
  { id: "members", label: "Members & Households", description: "Member and household management.", navHrefs: ["/members"], permissions: ["members.view"], defaultEnabled: true, group: "Programs" },
  { id: "reservations", label: "Reservations & Capacity", description: "Resident lap/lane reservations and capacity limits.", navHrefs: [], permissions: ["members.view"], defaultEnabled: false, comingSoon: true, group: "Programs" },
  { id: "guestPasses", label: "Guest Passes", description: "Resident guest passes and limits.", navHrefs: [], permissions: ["members.view"], defaultEnabled: false, comingSoon: true, group: "Programs" },

  { id: "chat", label: "Chat & Announcements", description: "Staff, board, and community messaging plus announcements.", navHrefs: ["/chat"], permissions: ["chat.view"], defaultEnabled: true, group: "Communication",
    subFeatures: [
      { id: "announcements", label: "Announcements", defaultEnabled: true },
      { id: "directMessages", label: "Direct messages", defaultEnabled: true },
      { id: "communityChannel", label: "Community announcements channel", defaultEnabled: true },
    ] },
  { id: "documents", label: "Documents & Rules", description: "Document library and rules with access control.", navHrefs: ["/documents"], permissions: ["documents.view"], defaultEnabled: true, group: "Communication" },

  { id: "payroll", label: "Payroll", description: "Timesheets, approvals, and payroll export.", navHrefs: ["/payroll"], permissions: ["payroll.view"], defaultEnabled: true, group: "Finance" },
  { id: "reports", label: "Reports & Exports", description: "Operational reporting and CSV exports.", navHrefs: ["/reports"], permissions: ["reports.view"], defaultEnabled: true, group: "Finance" },
  { id: "billing", label: "Billing & Dues", description: "Subscription and dues tracking.", navHrefs: ["/billing"], permissions: ["settings.manage"], defaultEnabled: true, group: "Finance" },

  { id: "community", label: "Community Network", description: "Cross-facility community network.", navHrefs: ["/community-network"], permissions: ["community.view"], defaultEnabled: false, group: "Network" },

  { id: "settings", label: "Settings", description: "Organization settings, users, roles, and branding.", navHrefs: ["/settings"], permissions: ["settings.view"], core: true, defaultEnabled: true, group: "System" },
];

export const MODULE_BY_ID: Record<ModuleId, AppModule> = Object.fromEntries(
  MODULES.map((m) => [m.id, m]),
) as Record<ModuleId, AppModule>;

/** The default feature map (module id → enabled) used by the base config. */
export function defaultFeatureMap(): Record<ModuleId, boolean> {
  const out = {} as Record<ModuleId, boolean>;
  for (const m of MODULES) out[m.id] = m.defaultEnabled;
  return out;
}

/** The default sub-feature map, keyed "moduleId.subId". */
export function defaultSubFeatureMap(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const m of MODULES) for (const sf of m.subFeatures ?? []) out[`${m.id}.${sf.id}`] = sf.defaultEnabled;
  return out;
}

/** Longest-prefix match: which module owns a given pathname (for route gating). */
export function moduleForPath(pathname: string): AppModule | undefined {
  let best: AppModule | undefined;
  let bestLen = -1;
  for (const m of MODULES) {
    for (const href of m.navHrefs) {
      const matches = pathname === href || pathname.startsWith(href + "/");
      if (matches && href.length > bestLen) { best = m; bestLen = href.length; }
    }
  }
  return best;
}
