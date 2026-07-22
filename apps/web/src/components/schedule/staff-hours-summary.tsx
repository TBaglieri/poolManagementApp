"use client";

import { getStaff, formatHours } from "@poolops/shared";
import type { StaffHourTotal } from "@poolops/scheduling";
import { StaffAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

export function StaffHoursSummary({ totals, maxHours = 40 }: { totals: StaffHourTotal[]; maxHours?: number }) {
  if (totals.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No staff assigned yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {totals.map((t) => {
        const pct = Math.min(100, (t.hours / Math.max(maxHours, t.preferredMax)) * 100);
        const over = t.overtime;
        const nearPref = t.hours > t.preferredMax && !over;
        return (
          <li key={t.staffId}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <StaffAvatar name={t.name} color={getStaff(t.staffId)?.avatarColor ?? "#0E7490"} size="xs" />
                {t.name}
              </span>
              <span className={cn("text-xs font-semibold", over ? "text-rose-600" : nearPref ? "text-amber-600" : "text-slate-500")}>
                {formatHours(t.hours)} · {t.shifts} shifts
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className={cn("h-full rounded-full transition-all", over ? "bg-rose-500" : nearPref ? "bg-amber-500" : "bg-brand-600")} style={{ width: `${pct}%` }} />
            </div>
            {(over || nearPref) && (
              <p className={cn("mt-1 text-xs", over ? "text-rose-500" : "text-amber-600")}>
                {over ? `Over ${maxHours}h limit` : `Above preferred ${t.preferredMax}h`}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
