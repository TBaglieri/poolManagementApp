"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronDown } from "lucide-react";
import { NAV_SECTIONS, isModuleEnabled, isDemoTenant, moduleForPath } from "@poolops/shared";
import { useAccess, useDisplayName } from "@/lib/access";
import { useSession } from "@/lib/session";
import { useTenantConfig, useRoleShortLabel } from "@/lib/tenant/provider";
import { TenantWordmark } from "@/components/theme/tenant-brand";
import { Icon } from "@/components/ui/icon";
import { StaffAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { canAny, staff, role } = useAccess();
  const config = useTenantConfig();
  const demo = isDemoTenant(config);
  const roleLabel = useRoleShortLabel(role);
  const displayName = useDisplayName();
  const fullName = staff ? `${staff.firstName} ${staff.lastName}` : displayName;
  const logout = useSession((s) => s.logout);

  // Filter by permission, whether the owning module is enabled, and demo-only gating.
  const sections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => {
      if (i.demoOnly && !demo) return false; // demo-only affordance, real tenant → hide
      const permitted = i.anyOf.length === 0 || canAny(i.anyOf);
      const mod = moduleForPath(i.href);
      const moduleOn = mod ? isModuleEnabled(config, mod.id) : true;
      return permitted && moduleOn;
    }),
  })).filter((s) => s.items.length > 0);

  // Let users tuck away sections they don't need mid-shift (e.g. System). Collapsed
  // is per-session state; a section with the active route stays open.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="flex h-full flex-col bg-navy-950 text-white">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
        <Link href="/dashboard" onClick={onNavigate} className="min-w-0">
          <TenantWordmark mono showType />
        </Link>
      </div>

      {/* Nav */}
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => {
          const hasActive = section.items.some((i) => pathname === i.href || (i.href !== "/dashboard" && pathname.startsWith(i.href)));
          const isCollapsed = !!collapsed[section.title] && !hasActive;
          return (
            <div key={section.title} className="mb-4">
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [section.title]: !c[section.title] }))}
                className="group flex w-full items-center gap-1.5 px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/35 hover:text-white/60"
                aria-expanded={!isCollapsed}
              >
                <ChevronDown className={cn("h-3 w-3 transition-transform", isCollapsed && "-rotate-90")} />
                {section.title}
              </button>
              {!isCollapsed && (
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group relative flex items-center gap-3 rounded-lg py-2 pl-4 pr-3 text-sm font-medium transition-colors",
                            active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
                          )}
                        >
                          {/* Active rail — the tenant accent, the one bold detail in the chrome. */}
                          {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent-400" aria-hidden />}
                          <Icon name={item.icon} className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand-300" : "text-white/45 group-hover:text-white/70")} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* User footer — real profile name for real users, demo staff name in demo. */}
      <div className="border-t border-white/10 p-3">
        {role && (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <StaffAvatar name={fullName} color={staff?.avatarColor ?? "rgb(var(--brand-700))"} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{fullName}</p>
              <p className="truncate text-xs text-white/45">{roleLabel}</p>
            </div>
            <Link href="/login" onClick={() => { logout(); onNavigate?.(); }} className="rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white" title="Sign out">
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
