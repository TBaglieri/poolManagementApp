"use client";

import { AlertTriangle, BadgeAlert, Baby, CalendarX2, Clock } from "lucide-react";
import type { DraftWarning, WarningType } from "@poolops/scheduling";
import { cn } from "@/lib/cn";

const META: Record<WarningType, { icon: typeof Clock; label: string; cls: string }> = {
  overtime: { icon: Clock, label: "Overtime risk", cls: "text-amber-600 bg-amber-50" },
  minor: { icon: Baby, label: "Minor labor rules", cls: "text-violet-600 bg-violet-50" },
  missing_cert: { icon: BadgeAlert, label: "Certification", cls: "text-rose-600 bg-rose-50" },
  coverage_gap: { icon: CalendarX2, label: "Coverage gap", cls: "text-rose-600 bg-rose-50" },
  availability: { icon: AlertTriangle, label: "Availability", cls: "text-slate-600 bg-slate-100" },
};

export function ScheduleWarningsPanel({ warnings }: { warnings: DraftWarning[] }) {
  if (warnings.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
        ✓ No warnings — this draft looks clean and ready to publish.
      </div>
    );
  }
  const groups = warnings.reduce<Record<string, DraftWarning[]>>((acc, w) => {
    (acc[w.type] ||= []).push(w);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {(Object.keys(groups) as WarningType[]).map((type) => {
        const m = META[type];
        const Icon = m.icon;
        return (
          <div key={type} className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", m.cls)}><Icon className="h-4 w-4" /></span>
              <span className="text-sm font-semibold text-slate-800">{m.label}</span>
              <span className="chip bg-slate-100 text-slate-500">{groups[type].length}</span>
            </div>
            <ul className="space-y-1 pl-9 text-sm text-slate-600">
              {groups[type].slice(0, 6).map((w, i) => <li key={i} className="list-disc">{w.message}</li>)}
              {groups[type].length > 6 && <li className="text-slate-400">+{groups[type].length - 6} more…</li>}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
