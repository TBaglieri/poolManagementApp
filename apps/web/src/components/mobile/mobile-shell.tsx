"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, CalendarDays, MessageSquare, Clock, User, Monitor, Wifi } from "lucide-react";
import { getSyncStatus } from "@poolops/supabase";
import { useSession } from "@/lib/session";
import { useAccess, useHydrated } from "@/lib/access";
import { BrandMark } from "@/components/brand";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/m/home", label: "Home", icon: Home },
  { href: "/m/my-schedule", label: "Schedule", icon: CalendarDays },
  { href: "/m/chat", label: "Chat", icon: MessageSquare },
  { href: "/m/clock", label: "Clock", icon: Clock },
  { href: "/m/profile", label: "Profile", icon: User },
];

const SYNC_LABEL: Record<string, string> = {
  "supabase-connected": "Live sync",
  "supabase-unconfigured": "Setup needed",
  "local-demo": "Demo mode",
};

/** Phone-framed mobile app preview shell (renders on web). */
export function MobileShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { role, staff } = useAccess();

  useEffect(() => {
    if (hydrated && !role) router.replace("/login");
  }, [hydrated, role, router]);

  if (!hydrated || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950">
        <BrandMark size="lg" className="animate-pulse" />
      </div>
    );
  }

  const sync = getSyncStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-brand-950 px-0 py-0 sm:px-4 sm:py-8">
      {/* Desktop: show a phone frame. Mobile: full-bleed. */}
      <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col bg-slate-50 shadow-lift sm:min-h-0 sm:h-[860px] sm:max-h-[90vh] sm:overflow-hidden sm:rounded-[2.25rem] sm:border-8 sm:border-navy-950">
        {/* Status bar */}
        <div className="flex items-center justify-between bg-navy-950 px-5 py-2 text-[11px] text-white/80">
          <span className="font-semibold">PoolOps</span>
          <span className="flex items-center gap-1.5">
            <Wifi className="h-3 w-3" />
            <span className={cn("h-1.5 w-1.5 rounded-full", sync === "supabase-connected" ? "bg-emerald-400" : sync === "supabase-unconfigured" ? "bg-amber-400" : "bg-slate-400")} />
            {SYNC_LABEL[sync]}
          </span>
        </div>

        {/* App header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <BrandMark size="sm" />
            <div className="leading-none">
              <p className="text-sm font-bold text-slate-900">PoolOps<span className="text-brand-500"> Pro</span></p>
              <p className="mt-0.5 text-[10px] text-slate-400">{staff ? `${staff.firstName} · ${staff.title}` : "Mobile app"}</p>
            </div>
          </div>
          <Link href="/dashboard" className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50" title="Open web dashboard">
            <Monitor className="h-3.5 w-3.5" /> Web
          </Link>
        </header>

        {/* Scrollable content */}
        <main className="scrollbar-thin flex-1 overflow-y-auto">{children}</main>

        {/* Bottom tab bar */}
        <nav className="flex items-center justify-around border-t border-slate-200 bg-white px-1 py-1.5">
          {TABS.map((t) => {
            const active = pathname === t.href || pathname.startsWith(t.href);
            return (
              <Link key={t.href} href={t.href} className={cn("flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition-colors", active ? "text-brand-600" : "text-slate-400")}>
                <t.icon className={cn("h-5 w-5", active && "text-brand-600")} />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/** Simple mobile section heading. */
export function MSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
