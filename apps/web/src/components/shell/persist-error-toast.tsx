"use client";

/**
 * Surfaces Supabase WRITE failures as dismissible toasts, so a "Save" that didn't
 * persist is visible instead of silently lost on refresh. The message is the raw
 * Postgres error — e.g. a not-null on organization_id or a missing column means the
 * SQL migrations still need to be run.
 */
import { AlertTriangle, X } from "lucide-react";
import { usePersistStatus } from "@/lib/repos/persist-status";

export function PersistErrorToast() {
  const errors = usePersistStatus((s) => s.errors);
  const dismiss = usePersistStatus((s) => s.dismiss);
  if (errors.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
      {errors.map((e) => (
        <div key={e.id} className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-rose-200 bg-white p-3 shadow-lift dark:border-rose-900/50 dark:bg-slate-900">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50"><AlertTriangle className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Couldn’t save to the database</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">{e.op} {e.table}</span> — {e.message}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">If this mentions a missing column or a null organization_id, run <code>supabase/_run_all.sql</code>.</p>
          </div>
          <button onClick={() => dismiss(e.id)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Dismiss"><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}
