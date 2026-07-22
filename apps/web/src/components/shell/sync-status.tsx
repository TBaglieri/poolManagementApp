"use client";

import { useEffect, useState } from "react";
import { getEffectiveDataMode } from "@poolops/supabase";
import { isDemoTenant } from "@poolops/shared";
import { useHealth, type HealthStatus } from "@/lib/repos/health";
import { useTenantConfig } from "@/lib/tenant/provider";
import { showsLocalDemoChip } from "@/lib/demo-mode";
import { cn } from "@/lib/cn";

const META: Record<HealthStatus, { label: string; dot: string; text: string; ring: string; pulse: boolean; tip: string }> = {
  connected: { label: "Live sync", dot: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-600/20 bg-emerald-50", pulse: true,
    tip: "Supabase connected & schema present — web + mobile share this data in real time." },
  "schema-missing": { label: "Schema needed", dot: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-600/20 bg-amber-50", pulse: false,
    tip: "Connected to Supabase, but tables aren't created yet. Run supabase/schema.sql. Showing demo data until then." },
  unconfigured: { label: "Setup needed", dot: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-600/20 bg-amber-50", pulse: false,
    tip: "Data mode is Supabase but env vars are missing. Falling back to local data." },
  error: { label: "Offline", dot: "bg-rose-500", text: "text-rose-700", ring: "ring-rose-600/20 bg-rose-50", pulse: false,
    tip: "Supabase is unreachable. Falling back to local data." },
  mock: { label: "Local demo", dot: "bg-slate-400", text: "text-slate-600", ring: "ring-slate-500/15 bg-slate-100", pulse: false,
    tip: "Running on bundled demo data. Set NEXT_PUBLIC_DATA_MODE=supabase to sync." },
};

export function SyncStatus({ compact = false }: { compact?: boolean }) {
  const health = useHealth();
  const config = useTenantConfig();
  const [synced, setSynced] = useState<string>("");

  useEffect(() => {
    const stamp = () => setSynced(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    stamp();
    const t = setInterval(stamp, 60_000);
    return () => clearInterval(t);
  }, []);

  // "Local demo" (mock data) is demo chrome — never show it outside the demo tenant.
  if (health.status === "mock" && !showsLocalDemoChip(isDemoTenant(config), "mock")) return null;

  const m = META[health.status];
  return (
    <div
      className={cn("chip ring-1 ring-inset", m.ring, m.text)}
      title={`${m.tip}${synced ? `  ·  Last checked ${synced}` : ""}  ·  mode: ${getEffectiveDataMode()}`}
    >
      <span className="relative flex h-2 w-2">
        {m.pulse && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", m.dot)} />}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", m.dot)} />
      </span>
      <span className="font-semibold">{m.label}</span>
      {!compact && synced && <span className="hidden font-normal opacity-70 lg:inline">· {synced}</span>}
    </div>
  );
}
