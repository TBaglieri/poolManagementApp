import type { Role, RoleSlug } from "../types";

/**
 * The 12 access levels for PoolOps Pro. `level` is a coarse ranking used for
 * display/sorting only — real authorization comes from the permission map.
 */
export const ROLES: Record<RoleSlug, Role> = {
  super_admin: {
    slug: "super_admin",
    name: "Platform Owner / Super Admin",
    shortName: "Super Admin",
    description: "Full access across every organization, facility, billing, and global configuration.",
    surface: "web",
    accent: "violet",
    level: 100,
  },
  org_admin: {
    slug: "org_admin",
    name: "Organization Admin / Pool Director",
    shortName: "Org Admin",
    description: "Full access within one organization: facilities, staff, payroll exports, reports, settings.",
    surface: "both",
    accent: "navy",
    level: 90,
  },
  ops_manager: {
    slug: "ops_manager",
    name: "Operations Manager",
    shortName: "Ops Manager",
    description: "Day-to-day operations: chemicals, inspections, checklists, maintenance, patron counts, reports.",
    surface: "both",
    accent: "cyan",
    level: 70,
  },
  lifeguard_manager: {
    slug: "lifeguard_manager",
    name: "Lifeguard / Aquatics Manager",
    shortName: "Guard Manager",
    description: "Lifeguard coverage, certifications, rotations, shift reports, safety checklists, approvals.",
    surface: "both",
    accent: "teal",
    level: 65,
  },
  scheduling_manager: {
    slug: "scheduling_manager",
    name: "Scheduling Manager",
    shortName: "Scheduler",
    description: "Builds schedules, assigns shifts, approves trades & time-off, publishes coverage.",
    surface: "web",
    accent: "indigo",
    level: 60,
  },
  payroll_team: {
    slug: "payroll_team",
    name: "Payroll / Payment Team",
    shortName: "Payroll",
    description: "Time clock records, timesheets, payroll exports, payment status, financial reports.",
    surface: "web",
    accent: "emerald",
    level: 55,
  },
  hr_coordinator: {
    slug: "hr_coordinator",
    name: "HR / Onboarding Coordinator",
    shortName: "HR / Onboarding",
    description: "Onboarding, employee documents, certifications, handbook acknowledgments, staff invites.",
    surface: "web",
    accent: "amber",
    level: 55,
  },
  head_lifeguard: {
    slug: "head_lifeguard",
    name: "Head Lifeguard",
    shortName: "Head Guard",
    description: "Assigned facility operations, shift reports, checklists, patron counts, team messaging.",
    surface: "mobile",
    accent: "cyan",
    level: 30,
  },
  lifeguard: {
    slug: "lifeguard",
    name: "Lifeguard / Staff",
    shortName: "Lifeguard",
    description: "Own schedule, clock in/out, time-off & trade requests, onboarding, checklists, chat.",
    surface: "mobile",
    accent: "slate",
    level: 10,
  },
  swim_instructor: {
    slug: "swim_instructor",
    name: "Swim Instructor",
    shortName: "Instructor",
    description: "Lesson schedule, class rosters, attendance, student progress notes, manager messaging.",
    surface: "mobile",
    accent: "teal",
    level: 25,
  },
  maintenance: {
    slug: "maintenance",
    name: "Maintenance Staff",
    shortName: "Maintenance",
    description: "Assigned maintenance tickets, status updates, notes/photos, facility issue history.",
    surface: "mobile",
    accent: "amber",
    level: 20,
  },
  auditor: {
    slug: "auditor",
    name: "Read-Only Auditor / Inspector",
    shortName: "Auditor",
    description: "Read-only access to chemical records, inspections, checklists, and compliance exports.",
    surface: "web",
    accent: "slate",
    level: 15,
  },
};

export const ROLE_LIST: Role[] = Object.values(ROLES).sort((a, b) => b.level - a.level);

/** Every role slug in the base product (platform owner included). */
export const ALL_ROLE_SLUGS = Object.keys(ROLES) as RoleSlug[];

/** Tenant-selectable role slugs (excludes the platform-level super_admin). */
export const TENANT_ROLE_SLUGS = ALL_ROLE_SLUGS.filter((s) => s !== "super_admin");

export function getRole(slug: RoleSlug): Role {
  return ROLES[slug];
}
