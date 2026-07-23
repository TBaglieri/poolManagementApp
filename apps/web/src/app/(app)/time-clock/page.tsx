"use client";

import { useState } from "react";
import { Clock, MapPin, Play, Square, AlertTriangle, Download } from "lucide-react";
import {
  getStaff, staffName, facilityName, formatTime, formatHours, shiftDuration,
} from "@poolops/shared";
import { useAccess, useMyStaffId, useStaffProfileState } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { useTenantSeed } from "@/lib/tenant-data";
import { UnlinkedStaffNotice } from "@/components/shell/unlinked-staff-notice";
import { downloadCSV } from "@/lib/csv";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StaffAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import type { TimeClockEntry } from "@poolops/shared";
import { cn } from "@/lib/cn";

const STATUS_BADGE: Record<TimeClockEntry["status"], { label: string; intent: "success" | "warning" | "danger" | "neutral" | "info" }> = {
  clocked_in: { label: "Clocked in", intent: "success" },
  clocked_out: { label: "Clocked out", intent: "neutral" },
  late: { label: "Late", intent: "warning" },
  missed_in: { label: "Missed in", intent: "danger" },
  missed_out: { label: "Missed out", intent: "danger" },
};

export default function TimeClockPage() {
  const { can, staff: me, facilityId } = useAccess();
  const myStaffId = useMyStaffId();
  const profileState = useStaffProfileState();
  const { facilities } = useTenantSeed();
  const clock = useDemo((s) => s.clock);
  const toggleClock = useDemo((s) => s.toggleClock);
  const [facility, setFacility] = useState(me?.homeFacilityId ?? facilities[0]?.id ?? "");

  const isManager = can("timeclock.manage");
  // Clock actions act as the REAL linked staff member (or demo staff in demo mode).
  const myEntry = clock.find((e) => e.staffId === myStaffId && (e.status === "clocked_in" || e.status === "late"));
  const clockedIn = clock.filter((e) => e.status === "clocked_in" || e.status === "late");
  const missed = clock.filter((e) => e.status === "missed_in" || e.status === "missed_out");
  const facMatch = (fid: string) => facilityId === "all" || fid === facilityId;

  const entryHours = (e: TimeClockEntry) => {
    if (!e.clockIn || !e.clockOut) return 0;
    const ms = new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime();
    return Math.max(0, ms / 3_600_000 - (e.breakMinutes ?? 0) / 60);
  };

  const exportCSV = () => {
    const rows = clock.filter((e) => facMatch(e.facilityId)).map((e) => ({
      staff: staffName(e.staffId),
      facility: facilityName(e.facilityId),
      clockIn: e.clockIn ? new Date(e.clockIn).toLocaleString() : "",
      clockOut: e.clockOut ? new Date(e.clockOut).toLocaleString() : "",
      breakMinutes: e.breakMinutes ?? 0,
      hours: entryHours(e).toFixed(2),
      status: e.status.replace("_", " "),
    }));
    downloadCSV(`timesheet-${new Date().toISOString().slice(0, 10)}`, rows, [
      { key: "staff", label: "Staff" },
      { key: "facility", label: "Facility" },
      { key: "clockIn", label: "Clock in" },
      { key: "clockOut", label: "Clock out" },
      { key: "breakMinutes", label: "Break (min)" },
      { key: "hours", label: "Hours" },
      { key: "status", label: "Status" },
    ]);
  };

  // Staff personal clock card (works for real linked staff — not gated on demo `me`).
  const ClockCard = (
    <SectionCard title="Time clock" subtitle="Clock in and out for your shift">
      <div className="flex flex-col items-center gap-4 py-4">
        <div className={cn("flex h-24 w-24 items-center justify-center rounded-full", myEntry ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}>
          <Clock className="h-10 w-10" />
        </div>
        <div className="text-center">
          {myEntry ? (
            <>
              <p className="text-sm font-semibold text-emerald-700">Clocked in at {formatTime(myEntry.clockIn!)}</p>
              <p className="text-xs text-slate-400">{facilityName(myEntry.facilityId)}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-700">You're not clocked in</p>
              <p className="text-xs text-slate-400">Select your facility and clock in</p>
            </>
          )}
        </div>
        {!myEntry && (
          <Select value={facility} onChange={(e) => setFacility(e.target.value)} className="max-w-xs">
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
        )}
        <Button size="lg" variant={myEntry ? "danger" : "primary"} disabled={!myStaffId || !facility} onClick={() => myStaffId && toggleClock(myStaffId, facility)}>
          {myEntry ? <><Square className="h-4 w-4" /> Clock out</> : <><Play className="h-4 w-4" /> Clock in</>}
        </Button>
        <p className="flex items-center gap-1.5 text-xs text-slate-400"><MapPin className="h-3.5 w-3.5" /> GPS / geofence verification (placeholder)</p>
      </div>
    </SectionCard>
  );

  if (!isManager) {
    return (
      <div className="space-y-6">
        <PageHeader title="Time Clock" subtitle="Track your shift hours." />
        <div className="mx-auto max-w-md">{profileState === "unlinked" ? <UnlinkedStaffNotice /> : ClockCard}</div>
      </div>
    );
  }

  // Manager / payroll view
  const columns: Column<TimeClockEntry>[] = [
    { key: "staff", header: "Staff", render: (e) => (
      <div className="flex items-center gap-3">
        <StaffAvatar name={staffName(e.staffId)} color={getStaff(e.staffId)?.avatarColor ?? "#0E7490"} size="sm" />
        <span className="font-medium text-slate-800">{staffName(e.staffId)}</span>
      </div>
    ) },
    { key: "facility", header: "Facility", hideOnMobile: true, render: (e) => <span className="text-slate-600">{facilityName(e.facilityId)}</span> },
    { key: "in", header: "Clock in", render: (e) => <span className="text-slate-600">{e.clockIn ? formatTime(e.clockIn) : "—"}</span> },
    { key: "out", header: "Clock out", render: (e) => <span className="text-slate-600">{e.clockOut ? formatTime(e.clockOut) : "—"}</span> },
    { key: "status", header: "Status", render: (e) => <Badge intent={STATUS_BADGE[e.status].intent}>{STATUS_BADGE[e.status].label}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Time Clock" subtitle="Live attendance and timesheet monitoring."
        actions={can("payroll.export") && <Button variant="secondary" icon="Download" onClick={exportCSV} disabled={clock.length === 0}>Export CSV</Button>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Clocked in now" value={clockedIn.length} icon="UserCheck" intent="success" />
        <StatCard label="Late arrivals" value={clock.filter((e) => e.status === "late").length} icon="Clock" intent="warning" />
        <StatCard label="Missed punches" value={missed.length} icon="AlertTriangle" intent="danger" />
        <StatCard label="Entries today" value={clock.length} icon="ListChecks" intent="brand" />
      </div>

      {missed.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="mr-1.5 inline h-4 w-4" />
          {missed.length} missed punch{missed.length > 1 ? "es" : ""} need review — {missed.map((m) => staffName(m.staffId)).join(", ")}.
        </div>
      )}

      <SectionCard title="Timesheet" subtitle="Today's clock activity">
        <DataTable columns={columns} rows={clock.filter((e) => facMatch(e.facilityId))} getKey={(e) => e.id} />
      </SectionCard>

      <div className="mx-auto max-w-md">{ClockCard}</div>
    </div>
  );
}
