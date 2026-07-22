"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Sparkles, CalendarDays, CheckCircle2, XCircle, Smartphone, ArrowRight, Clock,
} from "lucide-react";
import {
  shifts as seedShifts, facilities, getStaff, staffName, facilityName,
  format24h, formatWeekday, formatShortDate, shiftDuration, SHIFT_POSITION_LABELS,
} from "@poolops/shared";
import { mondayOf } from "@poolops/scheduling";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { StaffAvatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { PermissionGate } from "@/components/ui/permission-gate";
import { requestStatusMeta } from "@/lib/status";
import { cn } from "@/lib/cn";

const FAC_COLOR: Record<string, string> = {
  fac_maplewood: "#0891B2", fac_riverbend: "#0d9488", fac_northside: "#2563eb", fac_lakeside: "#0ea5e9",
};

function dayDate(weekStart: string, i: number) {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + i);
  return d;
}

export default function SchedulePage() {
  const { can, staff: me, facilityId } = useAccess();
  const published = useDemo((s) => s.publishedShifts);
  const timeOff = useDemo((s) => s.timeOff);
  const trades = useDemo((s) => s.trades);
  const reviewTimeOff = useDemo((s) => s.reviewTimeOff);
  const reviewTrade = useDemo((s) => s.reviewTrade);

  const weekStart = mondayOf(0);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => dayDate(weekStart, i)), [weekStart]);
  const dayKeys = days.map((d) => d.toISOString().slice(0, 10));

  const facMatch = (fid: string) => facilityId === "all" || fid === facilityId;
  const allShifts = useMemo(() => [...seedShifts, ...published], [published]);
  const weekShifts = allShifts.filter((s) => dayKeys.includes(s.date) && facMatch(s.facilityId));

  const isManager = can("schedule.view");
  const total = weekShifts.length;
  const filled = weekShifts.filter((s) => s.assignedStaffId).length;
  const open = total - filled;
  const coverage = total ? Math.round((filled / total) * 100) : 100;
  const scheduledHours = weekShifts.reduce((sum, s) => sum + shiftDuration(s.start, s.end), 0);

  const pendingTimeOff = timeOff.filter((r) => r.status === "pending");
  const pendingTrades = trades.filter((t) => t.status === "pending");

  // staff "my schedule"
  const myShifts = allShifts.filter((s) => s.assignedStaffId === me?.id && dayKeys.includes(s.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const openToPickUp = allShifts.filter((s) => !s.assignedStaffId && dayKeys.includes(s.date) && me?.facilityIds.includes(s.facilityId));

  return (
    <div className="space-y-6">
      <PageHeader
        title={isManager ? "Schedule" : "My Schedule"}
        subtitle={`Week of ${formatShortDate(days[0])} – ${formatShortDate(days[6])} · ${facilityId === "all" ? "All facilities" : facilityName(facilityId)}`}
        actions={
          <PermissionGate anyOf={["schedule.manage"]}>
            <Link href="/schedule/drafts" className="btn-secondary"><CalendarDays className="h-4 w-4" /> Drafts</Link>
            <Link href="/schedule/auto-builder" className="btn-primary"><Sparkles className="h-4 w-4" /> Auto Builder</Link>
          </PermissionGate>
        }
      />

      {isManager ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Coverage" value={`${coverage}%`} icon="ShieldCheck" intent={coverage >= 90 ? "success" : "warning"} hint={`${filled}/${total} shifts`} />
            <StatCard label="Open shifts" value={open} icon="CalendarX2" intent={open > 0 ? "warning" : "success"} />
            <StatCard label="Scheduled hours" value={Math.round(scheduledHours)} icon="Clock" intent="brand" hint="This week" />
            <StatCard label="Pending approvals" value={pendingTimeOff.length + pendingTrades.length} icon="Inbox" intent="info" />
          </div>

          <PermissionGate anyOf={["schedule.manage"]}>
            <Link href="/schedule/auto-builder" className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-cyan-50 p-4 transition-shadow hover:shadow-soft">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white"><Sparkles className="h-5 w-5" /></span>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Generate next week's schedule automatically</p>
                <p className="text-sm text-slate-500">The Auto Builder honours time off, availability, certs & coverage rules.</p>
              </div>
              <ArrowRight className="h-5 w-5 text-brand-600" />
            </Link>
          </PermissionGate>

          <SectionCard title="Weekly schedule" subtitle="Published shifts across the week">
            <div className="scrollbar-thin overflow-x-auto">
              <div className="grid min-w-[920px] grid-cols-7 gap-3">
                {days.map((d, i) => {
                  const dayShifts = weekShifts.filter((s) => s.date === dayKeys[i]).sort((a, b) => a.start.localeCompare(b.start));
                  const weekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div key={i}>
                      <div className={cn("mb-2 rounded-lg px-2 py-1.5 text-center", weekend ? "bg-brand-50" : "bg-slate-50")}>
                        <p className="text-xs font-semibold text-slate-700">{formatWeekday(d)}</p>
                        <p className="text-[11px] text-slate-400">{formatShortDate(d)}</p>
                      </div>
                      <div className="space-y-2">
                        {dayShifts.length === 0 && <p className="py-3 text-center text-[11px] text-slate-300">—</p>}
                        {dayShifts.map((s) => {
                          const assignee = getStaff(s.assignedStaffId);
                          return (
                            <div key={s.id} className={cn("rounded-lg border p-2 text-xs", s.assignedStaffId ? "border-slate-200 bg-white" : "border-dashed border-amber-300 bg-amber-50/60")}>
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: FAC_COLOR[s.facilityId] }} />
                                <span className="font-semibold text-slate-700">{format24h(s.start)}–{format24h(s.end)}</span>
                              </div>
                              <p className="mt-0.5 truncate text-[11px] text-slate-400">{SHIFT_POSITION_LABELS[s.position]}</p>
                              <div className="mt-1 flex items-center gap-1.5">
                                {assignee ? (
                                  <>
                                    <StaffAvatar name={`${assignee.firstName} ${assignee.lastName}`} color={assignee.avatarColor} size="xs" />
                                    <span className="truncate text-[11px] font-medium text-slate-700">{assignee.firstName}</span>
                                  </>
                                ) : <span className="text-[11px] font-medium text-amber-700">Open</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SectionCard>

          <PermissionGate anyOf={["schedule.approve"]}>
            <div className="grid gap-6 lg:grid-cols-2">
              <SectionCard title="Time-off requests" subtitle={`${pendingTimeOff.length} pending`}>
                {pendingTimeOff.length === 0 ? <p className="py-4 text-center text-sm text-slate-400">No pending requests.</p> : (
                  <ul className="space-y-2.5">
                    {pendingTimeOff.map((r) => (
                      <li key={r.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5">
                        <StaffAvatar name={staffName(r.staffId)} color={getStaff(r.staffId)?.avatarColor ?? "#0E7490"} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{staffName(r.staffId)}</p>
                          <p className="truncate text-xs text-slate-400">{r.type} · {formatShortDate(r.startDate)} · {r.reason}</p>
                        </div>
                        <button onClick={() => reviewTimeOff(r.id, "approved", me?.id ?? "")} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" /></button>
                        <button onClick={() => reviewTimeOff(r.id, "denied", me?.id ?? "")} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50"><XCircle className="h-4 w-4" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
              <SectionCard title="Shift trades" subtitle={`${pendingTrades.length} pending`}>
                {pendingTrades.length === 0 ? <p className="py-4 text-center text-sm text-slate-400">No pending trades.</p> : (
                  <ul className="space-y-2.5">
                    {pendingTrades.map((t) => (
                      <li key={t.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5">
                        <StaffAvatar name={staffName(t.requestedBy)} color={getStaff(t.requestedBy)?.avatarColor ?? "#0E7490"} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{staffName(t.requestedBy)}</p>
                          <p className="truncate text-xs text-slate-400">{t.requestedTo ? `→ ${staffName(t.requestedTo)}` : "Open to anyone"} · {t.reason}</p>
                        </div>
                        <button onClick={() => reviewTrade(t.id, "approved")} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" /></button>
                        <button onClick={() => reviewTrade(t.id, "denied")} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50"><XCircle className="h-4 w-4" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          </PermissionGate>
        </>
      ) : (
        /* Staff: My Schedule */
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label="My shifts this week" value={myShifts.length} icon="CalendarDays" intent="brand" />
            <StatCard label="My hours" value={Math.round(myShifts.reduce((s, sh) => s + shiftDuration(sh.start, sh.end), 0))} icon="Clock" intent="info" />
            <StatCard label="Open to pick up" value={openToPickUp.length} icon="CalendarPlus" intent="warning" />
          </div>

          <SectionCard title="My shifts" subtitle={`Week of ${formatShortDate(days[0])}`}>
            {myShifts.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No shifts scheduled this week.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {myShifts.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                      <span className="text-[10px] font-semibold uppercase">{formatWeekday(s.date)}</span>
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{format24h(s.start)} – {format24h(s.end)}</p>
                      <p className="text-xs text-slate-400">{facilityName(s.facilityId)} · {SHIFT_POSITION_LABELS[s.position]}</p>
                    </div>
                    <StatusBadge {...requestStatusMeta("approved")} dot={false} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <Link href="/m/my-schedule" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-soft">
            <Smartphone className="h-5 w-5 text-brand-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Manage on mobile</p>
              <p className="text-xs text-slate-400">Request time off, trade shifts, and pick up open shifts from the app.</p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300" />
          </Link>
        </>
      )}
    </div>
  );
}
