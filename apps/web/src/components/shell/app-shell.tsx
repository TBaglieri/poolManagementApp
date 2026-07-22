"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Rocket, X } from "lucide-react";
import { ALL_NAV_ITEMS } from "@poolops/shared";
import { useAccess, useHydrated } from "@/lib/access";
import { useSession } from "@/lib/session";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { SupabaseHydrator } from "./supabase-hydrator";
import { RouteProgress } from "./route-progress";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { BrandMark } from "@/components/brand";

function Splash() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <BrandMark size="lg" className="animate-pulse" />
        <p className="text-sm font-medium text-slate-400">Loading PoolOps Pro…</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { role, canAny, isDemo } = useAccess();
  const mode = useSession((s) => s.mode);
  const hasOrganization = useSession((s) => s.hasOrganization);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (!role) { router.replace("/login"); return; }
    // Real customer without an organization → send to setup (never trap them).
    if (mode === "real" && !hasOrganization) router.replace("/setup");
  }, [hydrated, role, mode, hasOrganization, router]);

  useEffect(() => setMobileOpen(false), [pathname]);

  if (!hydrated || !role) return <Splash />;

  // UI-level route guard
  const navMatch = ALL_NAV_ITEMS.find(
    (i) => i.href === pathname || (i.href !== "/dashboard" && pathname.startsWith(i.href)),
  );
  const blocked = navMatch && navMatch.anyOf.length > 0 && !canAny(navMatch.anyOf);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <SupabaseHydrator />
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 animate-slide-in-right">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <RouteProgress />
        <Topbar onOpenSidebar={() => setMobileOpen(true)} />

        {isDemo && bannerOpen && (
          <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm sm:px-6">
            <Rocket className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="min-w-0 flex-1 truncate text-amber-800">
              <span className="font-semibold">You're exploring the demo.</span> Changes use sample data and may reset.
            </p>
            <Link href="/pricing" className="hidden shrink-0 rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 sm:inline-block">Create Your Real Organization</Link>
            <button onClick={() => setBannerOpen(false)} className="shrink-0 rounded p-1 text-amber-500 hover:bg-amber-100" aria-label="Dismiss"><X className="h-4 w-4" /></button>
          </div>
        )}

        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
            {blocked ? <AccessRestricted /> : children}
          </div>
        </main>
      </div>
    </div>
  );
}
