"use client";

import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { ALL_NAV_ITEMS } from "@poolops/shared";
import { FacilitySwitcher } from "./facility-switcher";
import { RoleSwitcher } from "./role-switcher";
import { NotificationsBell } from "./notifications";
import { QuickActions } from "./quick-actions";
import { SyncStatus } from "./sync-status";

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
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md sm:px-6">
      <button onClick={onOpenSidebar} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{pageTitle(pathname)}</h1>

      <div className="relative ml-2 hidden max-w-xs flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Search staff, shifts, facilities…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden md:block"><SyncStatus /></div>
        <FacilitySwitcher />
        <QuickActions />
        <NotificationsBell />
        <RoleSwitcher />
      </div>
    </header>
  );
}
