"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Rocket, X } from "lucide-react";
import { ALL_NAV_ITEMS, isModuleEnabled, moduleForPath, isDemoTenant } from "@poolops/shared";
import { getEffectiveDataMode } from "@poolops/supabase";
import { useAccess, useHydrated } from "@/lib/access";
import { useSession } from "@/lib/session";
import { useTenantConfig } from "@/lib/tenant/provider";
import { requiresLoginRedirect } from "@/lib/demo-mode";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { SupabaseHydrator } from "./supabase-hydrator";
import { ChatRealtime } from "./chat-realtime";
import { PersistErrorToast } from "./persist-error-toast";
import { SupabaseSessionSync } from "./supabase-session-sync";
import { DemoSeeder } from "./demo-seeder";
import { RouteProgress } from "./route-progress";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { TenantSplash } from "@/components/theme/tenant-brand";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { role, canAny } = useAccess();
  const config = useTenantConfig();
  const demoTenant = isDemoTenant(config);
  const mode = useSession((s) => s.mode);
  const authResolved = useSession((s) => s.authResolved);
  const hasOrganization = useSession((s) => s.hasOrganization);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(true);

  // On a real tenant with a backend, don't trust the persisted session until the
  // Supabase auth session has been reconciled (SupabaseSessionSync sets authResolved).
  const waitingForAuth = getEffectiveDataMode() === "supabase" && !demoTenant && !authResolved;
  const mustLogin = requiresLoginRedirect(hydrated, role, mode, demoTenant);

  useEffect(() => {
    if (!hydrated || waitingForAuth) return;
    // No valid session (or a demo session on a real tenant) → login. Never a demo user.
    if (mustLogin) { router.replace("/login"); return; }
    // Real customer without an organization → send to setup (never trap them).
    if (mode === "real" && !hasOrganization) router.replace("/setup");
  }, [hydrated, waitingForAuth, mustLogin, mode, hasOrganization, router]);

  useEffect(() => setMobileOpen(false), [pathname]);

  // The session bridge must run even while we show the splash, so it can resolve auth.
  if (!hydrated || waitingForAuth || mustLogin) {
    return (<><SupabaseSessionSync />{!hydrated ? <TenantSplash /> : <TenantSplash label={waitingForAuth ? "Signing you in…" : "Redirecting…"} />}</>);
  }

  // UI-level route guard (permission + tenant module gate; middleware also enforces server-side).
  const navMatch = ALL_NAV_ITEMS.find(
    (i) => i.href === pathname || (i.href !== "/dashboard" && pathname.startsWith(i.href)),
  );
  const permBlocked = navMatch && navMatch.anyOf.length > 0 && !canAny(navMatch.anyOf);
  const mod = moduleForPath(pathname);
  const moduleBlocked = mod ? !isModuleEnabled(config, mod.id) : false;
  const blocked = permBlocked || moduleBlocked;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <SupabaseSessionSync />
      <SupabaseHydrator />
      <ChatRealtime />
      <PersistErrorToast />
      <DemoSeeder />
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

        {isDemoTenant(config) && bannerOpen && (
          <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm sm:px-6">
            <Rocket className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="min-w-0 flex-1 truncate text-amber-800">
              <span className="font-semibold">You're exploring the demo.</span> Sample data only — switch roles from the top bar.
            </p>
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
