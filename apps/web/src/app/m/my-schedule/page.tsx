"use client";

import { useMemo } from "react";
import { CalendarPlus } from "lucide-react";
import {
  facilityName, format24h, formatWeekday, formatShortDate,
  shiftDuration, SHIFT_POSITION_LABELS,
} from "@poolops/shared";
import { mondayOf } from "@poolops/scheduling";
import { useAccess, useMyStaffId, useStaffProfileState } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { MSection } from "@/components/mobile/mobile-shell";
import { StaffRequestButtons } from "@/components/schedule/staff-requests";
import { UnlinkedStaffNotice } from "@/components/shell/unlinked-staff-notice";
import { cn } from "@/lib/cn";

export default function MobileMySchedule() {
  const { staff: me } = useAccess();
  const myStaffId = useMyStaffId();
  const profileState = useStaffProfileState();
  const shifts = useDemo((s) => s.shifts);
  const pickUpShift = useDemo((s) => s.pickUpShift);

  const weekStart = mondayOf(0);
  const dayKeys = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + "T00:00:00"); d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  }), [weekStart]);

  const all = shifts;
  const myShifts = all
    .filter((s) => myStaffId != null && s.assignedStaffId === myStaffId && dayKeys.includes(s.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const openShifts = all.filter((s) => !s.assignedStaffId && dayKeys.includes(s.date) && (me ? me.facilityIds.includes(s.facilityId) : false));
  const myHours = myShifts.reduce((s, sh) => s + shiftDuration(sh.start, sh.end), 0);
  const todayKey = new Date().toISOString().slice(0, 10);

  // Fail loudly: a real staff account with no linked profile can't have "my"
  // shifts — tell them to contact their admin instead of showing a blank week.
  if (profileState === "unlinked") {
    return (
      <div className="px-5 pt-6">
        <h1 className="text-xl font-bold text-slate-900">My Schedule</h1>
        <UnlinkedStaffNotice className="mt-4" />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="bg-white px-5 pb-4 pt-4">
        <h1 className="text-xl font-bold text-slate-900">My Schedule</h1>
        <p className="text-sm text-slate-500">Week of {formatShortDate(weekStart)}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Shifts" value={myShifts.length} />
          <Stat label="Hours" value={Math.round(myHours)} />
          <Stat label="Open" value={openShifts.length} accent />
        </div>
      </div>

      <MSection title="This week">
        {myShifts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-8 text-center text-sm text-slate-400">No shifts scheduled this week.</p>
        ) : (
          <ul className="space-y-2">
            {myShifts.map((s) => {
              const isToday = s.date === todayKey;
              return (
                <li key={s.id} className={cn("flex items-center gap-3 rounded-2xl border bg-white p-3", isToday ? "border-brand-300 ring-1 ring-brand-200" : "border-slate-200")}>
                  <span className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <span className="text-[10px] font-bold uppercase">{formatWeekday(s.date)}</span>
                    <span className="text-sm font-bold">{new Date(s.date + "T00:00:00").getDate()}</span>
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{format24h(s.start)} – {format24h(s.end)}</p>
                    <p className="text-xs text-slate-400">{facilityName(s.facilityId)} · {SHIFT_POSITION_LABELS[s.position]}</p>
                  </div>
                  {isToday && <span className="chip bg-brand-50 text-brand-700">Today</span>}
                </li>
              );
            })}
          </ul>
        )}
      </MSection>

      {openShifts.length > 0 && (
        <MSection title="Open shifts to pick up">
          <ul className="space-y-2">
            {openShifts.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-3">
                <CalendarPlus className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{formatWeekday(s.date)} · {format24h(s.start)}–{format24h(s.end)}</p>
                  <p className="text-xs text-slate-400">{facilityName(s.facilityId)}</p>
                </div>
                <button onClick={() => me && pickUpShift(s.id, me.id)} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white active:bg-amber-700">Pick up</button>
              </li>
            ))}
          </ul>
        </MSection>
      )}

      <MSection title="Requests">
        {me && <StaffRequestButtons me={me} myShifts={myShifts} />}
        <p className="mt-3 text-center text-xs text-slate-400">A manager reviews and approves each request.</p>
      </MSection>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl px-2 py-2 text-center", accent ? "bg-amber-50" : "bg-slate-50")}>
      <p className={cn("text-lg font-bold", accent ? "text-amber-700" : "text-slate-800")}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
