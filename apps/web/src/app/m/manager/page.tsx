"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2, XCircle, Clock, ShieldCheck, Wand2, Users, ArrowRight, Plane, ArrowLeftRight,
} from "lucide-react";
import {
  shifts as seedShifts, staffName, getStaff, facilityName, formatShortDate,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { MSection } from "@/components/mobile/mobile-shell";
import { StaffAvatar } from "@/components/ui/avatar";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { cn } from "@/lib/cn";

const todayKey = new Date().toISOString().slice(0, 10);

export default function MobileManager() {
  const { can, staffId, facilityId } = useAccess();
  const timeOff = useDemo((s) => s.timeOff);
  const trades = useDemo((s) => s.trades);
  const clock = useDemo((s) => s.clock);
  const shifts = useDemo((s) => s.shifts);
  const reviewTimeOff = useDemo((s) => s.reviewTimeOff);
  const reviewTrade = useDemo((s) => s.reviewTrade);

  const pendingTimeOff = timeOff.filter((r) => r.status === "pending");
  const pendingTrades = trades.filter((t) => t.status === "pending");
  const clockedIn = clock.filter((c) => c.status === "clocked_in" || c.status === "late");

  const todays = useMemo(() => {
    return shifts.filter((s) => s.date === todayKey && (facilityId === "all" || s.facilityId === facilityId));
  }, [shifts, facilityId]);
  const coverage = todays.length ? Math.round((todays.filter((s) => s.assignedStaffId).length / todays.length) * 100) : 100;

  if (!can("schedule.approve") && !can("schedule.manage")) {
    return <div className="p-4"><AccessRestricted message="Manager tools require a manager role." /></div>;
  }

  return (
    <div className="pb-4">
      <div className="bg-gradient-to-br from-navy-900 to-brand-800 px-5 pb-5 pt-5 text-white">
        <p className="text-sm text-white/80">Manager</p>
        <h1 className="text-2xl font-bold">Team & coverage</h1>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MStat label="Coverage" value={`${coverage}%`} />
          <MStat label="On shift" value={clockedIn.length} />
          <MStat label="Approvals" value={pendingTimeOff.length + pendingTrades.length} accent />
        </div>
      </div>

      <MSection title="Generate schedule">
        <Link href="/schedule/auto-builder" className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white"><Wand2 className="h-5 w-5" /></span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Open Auto Builder</p>
            <p className="text-xs text-slate-500">Draft & publish on the web dashboard</p>
          </div>
          <ArrowRight className="h-5 w-5 text-brand-400" />
        </Link>
      </MSection>

      <MSection title={`Time-off requests (${pendingTimeOff.length})`}>
        {pendingTimeOff.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-5 text-center text-sm text-slate-400">No pending requests.</p>
        ) : (
          <ul className="space-y-2">
            {pendingTimeOff.map((r) => (
              <li key={r.id} className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3">
                <Plane className="h-4 w-4 shrink-0 text-brand-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{staffName(r.staffId)}</p>
                  <p className="truncate text-xs text-slate-400">{r.type} · {formatShortDate(r.startDate)} · {r.reason}</p>
                </div>
                <button onClick={() => reviewTimeOff(r.id, "approved", staffId ?? "")} className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></button>
                <button onClick={() => reviewTimeOff(r.id, "denied", staffId ?? "")} className="rounded-lg bg-rose-50 p-1.5 text-rose-500"><XCircle className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </MSection>

      <MSection title={`Shift trades (${pendingTrades.length})`}>
        {pendingTrades.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-5 text-center text-sm text-slate-400">No pending trades.</p>
        ) : (
          <ul className="space-y-2">
            {pendingTrades.map((t) => (
              <li key={t.id} className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3">
                <ArrowLeftRight className="h-4 w-4 shrink-0 text-brand-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{staffName(t.requestedBy)}</p>
                  <p className="truncate text-xs text-slate-400">{t.requestedTo ? `→ ${staffName(t.requestedTo)}` : "Open"} · {t.reason}</p>
                </div>
                <button onClick={() => reviewTrade(t.id, "approved")} className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></button>
                <button onClick={() => reviewTrade(t.id, "denied")} className="rounded-lg bg-rose-50 p-1.5 text-rose-500"><XCircle className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </MSection>

      <MSection title="On shift now">
        {clockedIn.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-5 text-center text-sm text-slate-400">Nobody clocked in.</p>
        ) : (
          <ul className="space-y-2">
            {clockedIn.map((c) => {
              const s = getStaff(c.staffId);
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <StaffAvatar name={staffName(c.staffId)} color={s?.avatarColor ?? "#0E7490"} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{staffName(c.staffId)}</p>
                    <p className="text-xs text-slate-400">{facilityName(c.facilityId)}</p>
                  </div>
                  <span className={cn("chip", c.flagged ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
                    <Clock className="h-3 w-3" /> {c.status === "late" ? "Late" : "In"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </MSection>
    </div>
  );
}

function MStat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl px-2 py-2 text-center", accent ? "bg-amber-400/20" : "bg-white/10")}>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-white/70">{label}</p>
    </div>
  );
}
