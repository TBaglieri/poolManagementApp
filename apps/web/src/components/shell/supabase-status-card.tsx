"use client";

import { useEffect, useState } from "react";
import { Database, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Terminal } from "lucide-react";
import { getEffectiveDataMode } from "@poolops/supabase";
import { checkHealth, type Health } from "@/lib/repos/health";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/cn";

const ICON = {
  connected: { Icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50" },
  "schema-missing": { Icon: AlertTriangle, cls: "text-amber-600 bg-amber-50" },
  unconfigured: { Icon: AlertTriangle, cls: "text-amber-600 bg-amber-50" },
  error: { Icon: XCircle, cls: "text-rose-600 bg-rose-50" },
  mock: { Icon: Database, cls: "text-slate-500 bg-slate-100" },
} as const;

export function SupabaseStatusCard() {
  const [health, setHealth] = useState<Health | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => { setBusy(true); setHealth(await checkHealth()); setBusy(false); };
  useEffect(() => { run(); }, []);

  const status = health?.status ?? "mock";
  const { Icon, cls } = ICON[status];

  return (
    <SectionCard
      title="Supabase connection"
      icon={<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Database className="h-4 w-4" /></span>}
      actions={<button onClick={run} className="btn-secondary" disabled={busy}><RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} /> Test connection</button>}
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", cls)}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{health?.message ?? "Checking…"}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Mode: <span className="font-medium">{getEffectiveDataMode()}</span>
            {health?.checkedAt && <> · checked {new Date(health.checkedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</>}
          </p>
        </div>
      </div>

      {status === "schema-missing" && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="flex items-center gap-1.5 font-semibold"><Terminal className="h-4 w-4" /> Almost there — apply the schema</p>
          <p className="mt-1 text-xs">In the Supabase SQL editor, run (in order): <code>schema.sql</code> → <code>rls-policies.sql</code> → <code>realtime.sql</code> → <code>storage.sql</code> → <code>seed.sql</code>. Then click “Test connection”.</p>
        </div>
      )}
      {status === "unconfigured" && (
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Set <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and <code>NEXT_PUBLIC_DATA_MODE=supabase</code> in your <code>.env.local</code>.</p>
      )}
      {status === "connected" && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Live — reads and writes use your Supabase database. New chat messages, chemical logs, maintenance issues, and time-clock punches are persisted.</p>
      )}
    </SectionCard>
  );
}
