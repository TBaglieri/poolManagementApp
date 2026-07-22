"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronRight } from "lucide-react";
import { NAV_SECTIONS, organization, ORG_TYPE_LABELS } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useSession } from "@/lib/session";
import { Logo } from "@/components/brand";
import { Icon } from "@/components/ui/icon";
import { StaffAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { canAny, staff, roleMeta } = useAccess();
  const logout = useSession((s) => s.logout);

  const sections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => i.anyOf.length === 0 || canAny(i.anyOf)),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="flex h-full flex-col bg-navy-950 text-white">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
        <Link href="/dashboard" onClick={onNavigate} className="min-w-0">
          <Logo mono subtitle={`${organization.name} · ${ORG_TYPE_LABELS[organization.type]}`} />
        </Link>
      </div>

      {/* Nav */}
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/35">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon name={item.icon} className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand-300" : "text-white/45 group-hover:text-white/70")} />
                      <span className="truncate">{item.label}</span>
                      {active && <ChevronRight className="ml-auto h-4 w-4 text-brand-300" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-3">
        {staff && (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <StaffAvatar name={`${staff.firstName} ${staff.lastName}`} color={staff.avatarColor} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{staff.firstName} {staff.lastName}</p>
              <p className="truncate text-xs text-white/45">{roleMeta?.shortName}</p>
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
