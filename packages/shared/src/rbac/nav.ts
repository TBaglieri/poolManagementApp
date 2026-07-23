import type { PermissionKey, RoleSlug } from "../types";
import { canAny } from "./permissions";

/** A single sidebar link. `icon` is a lucide-react icon name resolved on the web. */
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  /** Visible if the current role has ANY of these. Empty = always visible. */
  anyOf: PermissionKey[];
  /** Demo-only affordance — never shown in a real tenant (e.g. the mobile preview). */
  demoOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", anyOf: ["dashboard.view"] },
      { label: "Mobile preview", href: "/m/home", icon: "Smartphone", anyOf: [], demoOnly: true },
    ],
  },
  {
    title: "Team",
    items: [
      { label: "Schedule", href: "/schedule", icon: "CalendarDays", anyOf: ["schedule.view", "schedule.self"] },
      { label: "Auto Builder", href: "/schedule/auto-builder", icon: "Wand2", anyOf: ["schedule.manage"] },
      { label: "Schedule Drafts", href: "/schedule/drafts", icon: "CalendarRange", anyOf: ["schedule.manage"] },
      { label: "Time Clock", href: "/time-clock", icon: "Clock", anyOf: ["timeclock.self", "timeclock.manage"] },
      { label: "Staff", href: "/staff", icon: "Users", anyOf: ["staff.view"] },
      { label: "Onboarding", href: "/onboarding", icon: "ClipboardList", anyOf: ["onboarding.view", "onboarding.self"] },
      { label: "Certifications", href: "/certifications", icon: "BadgeCheck", anyOf: ["certifications.view"] },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Facilities", href: "/facilities", icon: "Building2", anyOf: ["facilities.view"] },
      { label: "Chemical Logs", href: "/chemicals", icon: "FlaskConical", anyOf: ["chemicals.view"] },
      { label: "Checklists", href: "/checklists", icon: "ListChecks", anyOf: ["checklists.view", "checklists.complete"] },
      { label: "Inspections", href: "/inspections", icon: "ShieldCheck", anyOf: ["inspections.view"] },
      { label: "Maintenance", href: "/maintenance", icon: "Wrench", anyOf: ["maintenance.view", "maintenance.report"] },
      { label: "Shift Reports", href: "/shift-reports", icon: "FileText", anyOf: ["shiftreports.view", "shiftreports.submit"] },
      { label: "Patron Counts", href: "/patron-counts", icon: "UsersRound", anyOf: ["patroncounts.view", "patroncounts.log"] },
    ],
  },
  {
    title: "Programs",
    items: [
      { label: "Lessons", href: "/lessons", icon: "GraduationCap", anyOf: ["lessons.view"] },
      { label: "Members", href: "/members", icon: "HousePlus", anyOf: ["members.view"] },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Team Chat", href: "/chat", icon: "MessageSquare", anyOf: ["chat.view"] },
      { label: "Documents", href: "/documents", icon: "FolderClosed", anyOf: ["documents.view"] },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Payroll", href: "/payroll", icon: "Wallet", anyOf: ["payroll.view"] },
      { label: "Reports", href: "/reports", icon: "BarChart3", anyOf: ["reports.view"] },
    ],
  },
  {
    title: "Network",
    items: [
      { label: "Community Network", href: "/community-network", icon: "Network", anyOf: ["community.view"] },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Users & Access", href: "/settings/users", icon: "UserCog", anyOf: ["staff.invite", "staff.manage"] },
      { label: "Branding & Modules", href: "/settings/branding", icon: "Palette", anyOf: ["settings.manage"] },
      { label: "Billing", href: "/billing", icon: "CreditCard", anyOf: ["settings.manage"] },
      { label: "Settings", href: "/settings", icon: "Settings", anyOf: ["settings.view"] },
      // Own-account security (change password) — available to EVERY signed-in role.
      { label: "My Account", href: "/settings/security", icon: "KeyRound", anyOf: [] },
    ],
  },
];

/** Flattened list of every routable nav item, for guards & breadcrumbs. */
export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

/**
 * The landing route for a role — the FIRST real nav destination the role can
 * actually access, driven by the permission model (not hardcoded per role). So an
 * admin lands on the Dashboard, a lifeguard (no `dashboard.view`) lands on Schedule,
 * and any future role gets a sensible landing automatically. Never returns a page
 * the role can't view; falls back to the always-accessible "My Account".
 */
export function landingPathForRole(role: RoleSlug | null | undefined): string {
  if (!role) return "/login";
  for (const item of ALL_NAV_ITEMS) {
    if (item.demoOnly) continue;
    if (item.anyOf.length === 0 || canAny(role, item.anyOf)) return item.href;
  }
  return "/settings/security";
}
