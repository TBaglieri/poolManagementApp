"use client";

import { AlertTriangle } from "lucide-react";
import {
  facilities, staffForFacility, getStaff, format24h, formatWeekday, formatShortDate,
} from "@poolops/shared";
import type { ScheduleDraft, DraftShift } from "@poolops/scheduling";
import { StaffAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

const FAC_COLOR: Record<string, string> = {
  fac_maplewood: "#0891B2", fac_riverbend: "#0d9488", fac_northside: "#2563eb", fac_lakeside: "#0ea5e9",
};

function dayDate(weekStart: string, i: number): Date {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + i);
  return d;
}

export function ScheduleDraftCalendar({
  draft, editable, onReassign,
}: {
  draft: ScheduleDraft;
  editable?: boolean;
  onReassign?: (shiftId: string, staffId: string | null) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => dayDate(draft.weekStart, i));

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <div className="grid min-w-[920px] grid-cols-7 gap-3">
        {days.map((d) => {
          const key = d.toISOString().slice(0, 10);
          const dayShifts = draft.shifts.filter((s) => s.date === key).sort((a, b) => a.start.localeCompare(b.start));
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div key={key} className="min-w-0">
              <div className={cn("mb-2 rounded-lg px-2 py-1.5 text-center", isWeekend ? "bg-brand-50" : "bg-slate-50")}>
                <p className="text-xs font-semibold text-slate-700">{formatWeekday(d)}</p>
                <p className="text-[11px] text-slate-400">{formatShortDate(d)}</p>
              </div>
              <div className="space-y-2">
                {dayShifts.length === 0 && <p className="py-4 text-center text-[11px] text-slate-300">—</p>}
                {dayShifts.map((s) => <DraftCard key={s.id} shift={s} editable={editable} onReassign={onReassign} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DraftCard({
  shift: s, editable, onReassign,
}: {
  shift: DraftShift;
  editable?: boolean;
  onReassign?: (shiftId: string, staffId: string | null) => void;
}) {
  const color = FAC_COLOR[s.facilityId] ?? "#0891B2";
  const assignee = getStaff(s.assignedStaffId);
  const options = staffForFacility(s.facilityId);
  const hasWarn = s.warnings.length > 0;

  return (
    <div className={cn(
      "rounded-lg border p-2 text-xs",
      s.assignedStaffId ? "border-slate-200 bg-white" : "border-dashed border-amber-300 bg-amber-50/60",
    )}>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-semibold text-slate-700">{format24h(s.start)}–{format24h(s.end)}</span>
        {hasWarn && <AlertTriangle className="ml-auto h-3 w-3 text-amber-500" />}
      </div>
      <p className="mt-1 truncate text-[11px] text-slate-400">{s.label}</p>
      {editable && onReassign ? (
        <select
          value={s.assignedStaffId ?? ""}
          onChange={(e) => onReassign(s.id, e.target.value || null)}
          className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] focus:border-brand-400 focus:outline-none"
        >
          <option value="">— Open shift —</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>
          ))}
        </select>
      ) : (
        <div className="mt-1.5 flex items-center gap-1.5">
          {assignee ? (
            <>
              <StaffAvatar name={`${assignee.firstName} ${assignee.lastName}`} color={assignee.avatarColor} size="xs" />
              <span className="truncate text-[11px] font-medium text-slate-700">{assignee.firstName} {assignee.lastName}</span>
            </>
          ) : (
            <span className="text-[11px] font-medium text-amber-700">Open shift</span>
          )}
        </div>
      )}
    </div>
  );
}
