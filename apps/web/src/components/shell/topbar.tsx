"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, FlaskConical, LogOut } from "lucide-react";
import { ALL_NAV_ITEMS, isDemoTenant, landingPathForRole } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useSession } from "@/lib/session";
import { useTenantConfig } from "@/lib/tenant/provider";
import { TenantMark } from "@/components/theme/tenant-brand";
import { FacilitySwitcher } from "./facility-switcher";
import { RoleSwitcher } from "./role-switcher";
import { NotificationsBell } from "./notifications";
import { QuickActions } from "./quick-actions";
import { SyncStatus } from "./sync-status";
import { SchemeToggle } from "@/components/theme/scheme-toggle";

/** Top-right brand home button: tenant icon + name, links to the user's role-
 *  appropriate home (never a page they can't access). */
function TenantHomeButton() {
  const config = useTenantConfig();
  const { role } = useAccess();
  return (
    <Link
      href={landingPathForRole(role)}
      title={`${config.displayName} — home`}
      className="ml-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 pr-3 transition-colors hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-brand-500/50 dark:hover:bg-slate-800"
    >
      <TenantMark size="sm" />
      <span className="hidden max-w-[12rem] truncate text-sm font-semibold text-slate-800 dark:text-slate-100 sm:block">
        {config.displayName}
      </span>
    </Link>
  );
}

const TITLES: Record<string, string> = {
  "/billing": "Billing & Subscription",
  "/settings/roles": "Roles",
  "/settings/permissions": "Permissions",
  "/settings/subscription": "Subscription",
  "/community-network": "Community Network",
};

function pageTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  const match = ALL_NAV_ITEMS.find((i) => i.href === pathname || (i.href !== "/dashboard" && pathname.startsWith(i.href)));
  if (match) return match.label;
  if (pathname.startsWith("/settings")) return "Settings";
  return "Dashboard";
}

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const config = useTenantConfig();
  const demoTenant = isDemoTenant(config);
  const exitDemo = useSession((s) => s.exitDemo);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85 sm:px-6">
      <button onClick={onOpenSidebar} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">{pageTitle(pathname)}</h1>

      <div className="relative ml-2 hidden max-w-xs flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Search staff, shifts, facilities…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {demoTenant && (
          <div className="flex items-center gap-1.5">
            <span className="hidden items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-600/30 sm:inline-flex">
              <FlaskConical className="h-3.5 w-3.5" /> Demo
            </span>
            <button
              onClick={() => { exitDemo(); window.location.href = "/leave-demo"; }}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
              title="Leave the demo"
            >
              <LogOut className="h-3.5 w-3.5" /> Exit Demo
            </button>
          </div>
        )}
        <div className="hidden md:block"><SyncStatus /></div>
        <SchemeToggle />
        <FacilitySwitcher />
        <QuickActions />
        <NotificationsBell />
        {demoTenant && <RoleSwitcher />}
        <TenantHomeButton />
      </div>
    </header>
  );
}
