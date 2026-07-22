"use client";

import { useEffect, useState } from "react";
import { getSyncStatus, getEffectiveDataMode } from "@poolops/supabase";
import { cn } from "@/lib/cn";

const META = {
  "supabase-connected": { label: "Live sync", dot: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-600/20 bg-emerald-50", pulse: true,
    tip: "Supabase connected — web & mobile share this data in real time." },
  "supabase-unconfigured": { label: "Setup needed", dot: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-600/20 bg-amber-50", pulse: false,
    tip: "Data mode is Supabase but env vars are missing. Falling back to local data." },
  "local-demo": { label: "Local demo", dot: "bg-slate-400", text: "text-slate-600", ring: "ring-slate-500/15 bg-slate-100", pulse: false,
    tip: "Running on bundled demo data. Set NEXT_PUBLIC_DATA_MODE=supabase to sync." },
} as const;

export function SyncStatus({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<keyof typeof META>("local-demo");
  const [synced, setSynced] = useState<string>("");

  useEffect(() => {
    setStatus(getSyncStatus());
    const stamp = () =>
      setSynced(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    stamp();
    const t = setInterval(stamp, 60_000);
    return () => clearInterval(t);
  }, []);

  const m = META[status];
  return (
    <div
      className={cn("chip ring-1 ring-inset", m.ring, m.text)}
      title={`${m.tip}${synced ? `  ·  Last synced ${synced}` : ""}  ·  mode: ${getEffectiveDataMode()}`}
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
