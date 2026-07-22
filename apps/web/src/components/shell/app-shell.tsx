"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ALL_NAV_ITEMS } from "@poolops/shared";
import { useAccess, useHydrated } from "@/lib/access";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
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
  const { role, canAny } = useAccess();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !role) router.replace("/login");
  }, [hydrated, role, router]);

  useEffect(() => setMobileOpen(false), [pathname]);

  if (!hydrated || !role) return <Splash />;

  // UI-level route guard
  const navMatch = ALL_NAV_ITEMS.find(
    (i) => i.href === pathname || (i.href !== "/dashboard" && pathname.startsWith(i.href)),
  );
  const blocked = navMatch && navMatch.anyOf.length > 0 && !canAny(navMatch.anyOf);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
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
        <Topbar onOpenSidebar={() => setMobileOpen(true)} />
        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
            {blocked ? <AccessRestricted /> : children}
          </div>
        </main>
      </div>
    </div>
  );
}
