import type { PermissionKey, RoleSlug, StaffPermissionOverride } from "../types";

/**
 * Permission catalog. Grouped for the Settings → Permissions matrix.
 * Keys are `module.action`. `self` actions act on the current user's own data.
 *
 * NOTE: This is UI-level RBAC for the demo. Production must enforce the same
 * map server-side (see SECURITY.md). Never trust the client for authorization.
 */
export interface PermissionDef {
  key: PermissionKey;
  label: string;
  group: string;
}

export const PERMISSIONS: PermissionDef[] = [
  { key: "dashboard.view", label: "View dashboard", group: "General" },
  { key: "reports.view", label: "View reports & analytics", group: "General" },
  { key: "settings.view", label: "View settings", group: "General" },
  { key: "settings.manage", label: "Edit organization settings", group: "General" },
  { key: "roles.manage", label: "Manage roles", group: "General" },
  { key: "permissions.manage", label: "Manage permissions", group: "General" },
  { key: "platform.manage", label: "Manage platform (all orgs, billing)", group: "General" },

  { key: "facilities.view", label: "View facilities", group: "Facilities" },
  { key: "facilities.manage", label: "Create / edit facilities", group: "Facilities" },
  { key: "community.view", label: "View community network", group: "Facilities" },

  { key: "staff.view", label: "View staff directory", group: "Staff" },
  { key: "staff.manage", label: "Edit staff profiles", group: "Staff" },
  { key: "staff.invite", label: "Invite staff", group: "Staff" },

  { key: "onboarding.view", label: "View onboarding dashboard", group: "Onboarding" },
  { key: "onboarding.manage", label: "Manage onboarding tasks", group: "Onboarding" },
  { key: "onboarding.self", label: "Complete own onboarding", group: "Onboarding" },

  { key: "chat.view", label: "Read chat & announcements", group: "Communication" },
  { key: "chat.announce", label: "Post announcements", group: "Communication" },

  { key: "schedule.view", label: "View full schedule", group: "Scheduling" },
  { key: "schedule.self", label: "View own schedule", group: "Scheduling" },
  { key: "schedule.manage", label: "Create / edit shifts", group: "Scheduling" },
  { key: "schedule.approve", label: "Approve trades & time-off", group: "Scheduling" },

  { key: "timeclock.self", label: "Clock self in / out", group: "Time & Pay" },
  { key: "timeclock.manage", label: "View / adjust all time entries", group: "Time & Pay" },
  { key: "payroll.view", label: "View payroll & timesheets", group: "Time & Pay" },
  { key: "payroll.manage", label: "Approve timesheets", group: "Time & Pay" },
  { key: "payroll.export", label: "Export payroll", group: "Time & Pay" },

  { key: "certifications.view", label: "View certifications", group: "Compliance" },
  { key: "certifications.manage", label: "Manage certifications", group: "Compliance" },
  { key: "inspections.view", label: "View inspections", group: "Compliance" },
  { key: "inspections.manage", label: "Run inspections", group: "Compliance" },

  { key: "chemicals.view", label: "View chemical logs", group: "Operations" },
  { key: "chemicals.log", label: "Record chemical logs", group: "Operations" },
  { key: "checklists.view", label: "View checklists", group: "Operations" },
  { key: "checklists.complete", label: "Complete checklists", group: "Operations" },
  { key: "checklists.manage", label: "Manage checklist templates", group: "Operations" },
  { key: "shiftreports.view", label: "View shift reports", group: "Operations" },
  { key: "shiftreports.submit", label: "Submit shift reports", group: "Operations" },
  { key: "shiftreports.review", label: "Review shift reports", group: "Operations" },
  { key: "patroncounts.view", label: "View patron counts", group: "Operations" },
  { key: "patroncounts.log", label: "Record patron counts", group: "Operations" },
  { key: "maintenance.view", label: "View maintenance board", group: "Operations" },
  { key: "maintenance.report", label: "Report maintenance issues", group: "Operations" },
  { key: "maintenance.manage", label: "Assign / manage issues", group: "Operations" },

  { key: "lessons.view", label: "View lessons & classes", group: "Programs" },
  { key: "lessons.attendance", label: "Take lesson attendance", group: "Programs" },
  { key: "lessons.manage", label: "Manage lessons & rosters", group: "Programs" },
  { key: "members.view", label: "View members & households", group: "Programs" },
  { key: "members.manage", label: "Manage members & households", group: "Programs" },

  { key: "documents.view", label: "View documents", group: "Documents" },
  { key: "documents.manage", label: "Upload / manage documents", group: "Documents" },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSIONS.map((p) => p.key);

/**
 * Base role → permissions. `super_admin` and `org_admin` are handled as
 * wildcards inside `can()` so the map stays readable.
 */
export const ROLE_PERMISSIONS: Record<RoleSlug, PermissionKey[]> = {
  super_admin: ["*"], // everything, incl. platform.manage
  org_admin: ["**"], // everything except platform.manage

  ops_manager: [
    "dashboard.view", "reports.view", "settings.view",
    "facilities.view", "community.view",
    "staff.view",
    "onboarding.view",
    "chat.view", "chat.announce",
    "schedule.view", "schedule.manage", "schedule.approve",
    "timeclock.self", "timeclock.manage",
    "certifications.view",
    "chemicals.view", "chemicals.log",
    "checklists.view", "checklists.complete", "checklists.manage",
    "shiftreports.view", "shiftreports.submit", "shiftreports.review",
    "patroncounts.view", "patroncounts.log",
    "maintenance.view", "maintenance.report", "maintenance.manage",
    "inspections.view", "inspections.manage",
    "lessons.view", "members.view", "documents.view",
  ],

  lifeguard_manager: [
    "dashboard.view", "reports.view", "settings.view",
    "facilities.view",
    "staff.view",
    "chat.view", "chat.announce",
    "schedule.view", "schedule.manage", "schedule.approve",
    "timeclock.self", "timeclock.manage",
    "certifications.view", "certifications.manage",
    "chemicals.view",
    "checklists.view", "checklists.complete", "checklists.manage",
    "shiftreports.view", "shiftreports.submit", "shiftreports.review",
    "patroncounts.view", "patroncounts.log",
    "maintenance.view", "maintenance.report",
    "inspections.view", "inspections.manage",
    "lessons.view", "members.view", "documents.view",
  ],

  scheduling_manager: [
    "dashboard.view", "reports.view", "settings.view",
    "facilities.view",
    "staff.view",
    "chat.view", "chat.announce",
    "schedule.view", "schedule.manage", "schedule.approve",
    "timeclock.self", "timeclock.manage",
    "certifications.view",
    "shiftreports.view",
    "patroncounts.view",
    "documents.view",
  ],

  payroll_team: [
    "dashboard.view", "reports.view", "settings.view",
    "staff.view",
    "chat.view",
    "timeclock.self", "timeclock.manage",
    "payroll.view", "payroll.manage", "payroll.export",
    "documents.view",
  ],

  hr_coordinator: [
    "dashboard.view", "reports.view", "settings.view",
    "staff.view", "staff.manage", "staff.invite",
    "onboarding.view", "onboarding.manage",
    "chat.view", "chat.announce",
    "certifications.view", "certifications.manage",
    "members.view",
    "documents.view", "documents.manage",
  ],

  head_lifeguard: [
    "dashboard.view",
    "facilities.view",
    "chat.view", "chat.announce",
    "schedule.view", "schedule.self",
    "timeclock.self",
    "certifications.view",
    "chemicals.view",
    "checklists.view", "checklists.complete",
    "shiftreports.view", "shiftreports.submit",
    "patroncounts.view", "patroncounts.log",
    "maintenance.view", "maintenance.report",
    "inspections.view",
    "lessons.view",
    "onboarding.self",
    "documents.view",
  ],

  lifeguard: [
    "schedule.self",
    "timeclock.self",
    "onboarding.self",
    "chat.view",
    "checklists.view", "checklists.complete",
    "maintenance.report",
    // Front-line guards test and log water chemistry on deck (see brief §4/§6:
    // "a lifeguard is logging chlorine on a phone in bright sun") and file
    // end-of-shift / incident reports. This is a base-product capability, not a
    // per-tenant special case.
    "chemicals.view", "chemicals.log",
    "shiftreports.view", "shiftreports.submit",
  ],

  swim_instructor: [
    "lessons.view", "lessons.attendance",
    "schedule.self",
    "timeclock.self",
    "chat.view",
    "onboarding.self",
    "members.view",
  ],

  maintenance: [
    "maintenance.view", "maintenance.report",
    "schedule.self",
    "timeclock.self",
    "chat.view",
    "onboarding.self",
  ],

  auditor: [
    "dashboard.view", "reports.view",
    "facilities.view",
    "certifications.view",
    "chemicals.view",
    "checklists.view",
    "inspections.view",
    "documents.view",
  ],
};

/** Resolve a role's effective permission set, applying per-staff overrides. */
export function resolvePermissions(
  role: RoleSlug,
  overrides: StaffPermissionOverride[] = [],
): Set<PermissionKey> {
  let keys: PermissionKey[];
  if (role === "super_admin") {
    keys = [...ALL_PERMISSION_KEYS, "platform.manage", "roles.manage", "permissions.manage", "settings.manage"];
  } else if (role === "org_admin") {
    keys = ALL_PERMISSION_KEYS.filter((k) => k !== "platform.manage");
  } else {
    keys = [...ROLE_PERMISSIONS[role]];
  }
  const set = new Set(keys);
  for (const o of overrides) {
    if (o.effect === "grant") set.add(o.permission);
    else set.delete(o.permission);
  }
  return set;
}

export function can(
  role: RoleSlug,
  permission: PermissionKey,
  overrides: StaffPermissionOverride[] = [],
): boolean {
  if (role === "super_admin") return true;
  if (role === "org_admin") return permission !== "platform.manage";
  return resolvePermissions(role, overrides).has(permission);
}

export function canAny(
  role: RoleSlug,
  permissions: PermissionKey[],
  overrides: StaffPermissionOverride[] = [],
): boolean {
  return permissions.some((p) => can(role, p, overrides));
}

export function canAll(
  role: RoleSlug,
  permissions: PermissionKey[],
  overrides: StaffPermissionOverride[] = [],
): boolean {
  return permissions.every((p) => can(role, p, overrides));
}
