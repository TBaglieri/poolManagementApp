"use client";

import Link from "next/link";
import {
  Wrench, Megaphone, Wallet, ArrowRight, CheckCircle2, XCircle, UserPlus,
} from "lucide-react";
import {
  getStaff, staffName, facilityName, dateKey, format24h,
  relativeTime, daysUntil, CERT_TYPE_LABELS,
} from "@poolops/shared";
import { useAccess, useDisplayName } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { useTenantSeed } from "@/lib/tenant-data";
import { useTenantConfig, useModuleEnabled } from "@/lib/tenant/provider";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge, RoleBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { StaffAvatar } from "@/components/ui/avatar";
import { AlertCard } from "@/components/ui/alert-card";
import { PermissionGate } from "@/components/ui/permission-gate";
import { TrendArea } from "@/components/charts/charts-lazy";
import { facilityStatusMeta, certStatusMeta, priorityMeta } from "@/lib/status";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** A small, on-brand empty state used inside dashboard widgets. */
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">{children}</p>;
}

export default function DashboardPage() {
  const { staff: me, facilityId, roleMeta } = useAccess();
  const displayName = useDisplayName();
  const config = useTenantConfig();
  // Reference data is tenant-scoped: bundled sample data ONLY in the demo tenant,
  // empty for a real tenant (so nothing demo/sample ever shows here).
  const { facilities, staff: allStaff, staffCertifications, lessonClasses } = useTenantSeed();

  const timeOff = useDemo((s) => s.timeOff);
  const trades = useDemo((s) => s.trades);
  const issues = useDemo((s) => s.issues);
  const chemicals = useDemo((s) => s.chemicals);
  const messages = useDemo((s) => s.messages);
  const clock = useDemo((s) => s.clock);
  const patron = useDemo((s) => s.patron);
  const shifts = useDemo((s) => s.shifts);
  const reviewTimeOff = useDemo((s) => s.reviewTimeOff);
  const reviewTrade = useDemo((s) => s.reviewTrade);

  const lessonsOn = useModuleEnabled("lessons");
  const payrollOn = useModuleEnabled("payroll");

  const facMatch = (fid: string) => facilityId === "all" || fid === facilityId;
  const todayKey = dateKey(new Date());

  const todaysShifts = shifts.filter((s) => s.date === todayKey && facMatch(s.facilityId));
  const openShifts = shifts.filter((s) => s.status === "open" && facMatch(s.facilityId));
  const hasShifts = todaysShifts.length > 0;
  const coverage = hasShifts ? Math.round((todaysShifts.filter((s) => s.assignedStaffId).length / todaysShifts.length) * 100) : null;
  const clockedIn = clock.filter((e) => (e.status === "clocked_in" || e.status === "late") && facMatch(e.facilityId));
  const pendingTimeOff = timeOff.filter((r) => r.status === "pending");
  const pendingTrades = trades.filter((t) => t.status === "pending");
  const missingForms = allStaff.filter((s) => s.statusFlags.includes("missing_forms") && facMatch(s.homeFacilityId));
  const certRisk = staffCertifications.filter((c) => c.status === "expiring" || c.status === "expired");
  const chemWarn = chemicals.filter((c) => c.outOfRange.length > 0 && facMatch(c.facilityId));
  const openIssues = issues.filter((i) => i.status !== "resolved" && facMatch(i.facilityId));
  const onboardingStaff = allStaff.filter((s) => s.onboardingComplete < 100 && facMatch(s.homeFacilityId));

  const patronFacility = facilityId === "all" ? facilities[0]?.id : facilityId;
  const patronData = patron
    .filter((p) => p.facilityId === patronFacility && p.timeSlot.includes(":") && new Date(p.recordedAt).toDateString() === new Date().toDateString())
    .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
    .map((p) => ({ slot: format24h(p.timeSlot), count: p.count }));

  const announcements = messages.filter((m) => m.channelId === "ch_all").slice(-3).reverse();
  const upcomingLessons = lessonClasses.filter((l) => facMatch(l.facilityId)).slice(0, 4);
  const orgLabel = facilityId === "all" ? config.displayName : facilityName(facilityId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${displayName} 👋`}
        subtitle={`Here's what's happening across ${orgLabel} today.`}
        actions={roleMeta && <RoleBadge role={roleMeta.slug} />}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today's coverage" value={coverage === null ? "—" : `${coverage}%`} icon="ShieldCheck"
          intent={coverage === null ? "neutral" : coverage >= 90 ? "success" : coverage >= 70 ? "warning" : "danger"}
          hint={hasShifts ? `${todaysShifts.filter((s) => s.assignedStaffId).length}/${todaysShifts.length} shifts filled` : "No shifts scheduled yet"} />
        <StatCard label="Open shifts" value={openShifts.length} icon="CalendarX2" intent={openShifts.length ? "warning" : "neutral"} hint={openShifts.length ? "This week" : "None yet"} />
        <StatCard label="Pending approvals" value={pendingTimeOff.length + pendingTrades.length} icon="Inbox" intent={pendingTimeOff.length + pendingTrades.length ? "info" : "neutral"} hint={pendingTimeOff.length + pendingTrades.length ? "Time-off + trades" : "Nothing pending"} />
        <StatCard label="Clocked in now" value={clockedIn.length} icon="Clock" intent={clockedIn.length ? "brand" : "neutral"} hint={clockedIn.length ? "On shift" : "No one clocked in"} />
      </div>

      {chemWarn.length > 0 && (
        <AlertCard intent="danger" title={`${chemWarn.length} chemical reading${chemWarn.length > 1 ? "s" : ""} out of range`}
          action={<Link href="/chemicals" className="btn-secondary btn-sm">Review</Link>}>
          Latest: {facilityName(chemWarn[0].facilityId)} — {chemWarn[0].outOfRange.join(", ")} flagged. Corrective action may be required before reopening.
        </AlertCard>
      )}

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Patron trend */}
        <SectionCard className="lg:col-span-2" title="Patron count trend"
          subtitle={patronFacility ? `${facilityName(patronFacility)} · today by the hour` : "Today by the hour"}
          actions={<Link href="/patron-counts" className="text-sm font-medium text-brand-700 hover:text-brand-800">Details</Link>}>
          {patronData.length > 0 ? (
            <TrendArea data={patronData} xKey="slot" yKey="count" name="Patrons" />
          ) : (
            <Empty>No chemical or patron data yet — it'll appear here once your team starts logging.</Empty>
          )}
        </SectionCard>

        {/* Facility status */}
        <SectionCard title="Facility status" subtitle="Live operations"
          actions={<Link href="/facilities" className="text-sm font-medium text-brand-700 hover:text-brand-800">All</Link>}>
          {facilities.filter((f) => facMatch(f.id)).length === 0 ? (
            <Empty>No facilities added yet.</Empty>
          ) : (
            <ul className="space-y-3">
              {facilities.filter((f) => facMatch(f.id)).map((f) => {
                const meta = facilityStatusMeta(f.status);
                const here = clock.filter((e) => e.facilityId === f.id && (e.status === "clocked_in" || e.status === "late")).length;
                return (
                  <li key={f.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{f.name}</p>
                      <p className="text-xs text-slate-400">{here} clocked in · {staffName(f.managerId)}</p>
                    </div>
                    <StatusBadge {...meta} />
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        {/* Pending approvals */}
        <PermissionGate anyOf={["schedule.approve"]}>
          <SectionCard title="Pending approvals" subtitle="Time-off & shift trades"
            actions={<Link href="/schedule" className="text-sm font-medium text-brand-700 hover:text-brand-800">Queue</Link>}>
            {pendingTimeOff.length + pendingTrades.length === 0 ? (
              <Empty>Nothing pending.</Empty>
            ) : (
              <ul className="space-y-2.5">
                {pendingTimeOff.slice(0, 3).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800">
                    <StaffAvatar name={staffName(r.staffId)} color={getStaff(r.staffId)?.avatarColor ?? "#0E7490"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{staffName(r.staffId)}</p>
                      <p className="truncate text-xs text-slate-400">Time off · {r.reason}</p>
                    </div>
                    <button onClick={() => reviewTimeOff(r.id, "approved", me?.id ?? "")} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50" title="Approve"><CheckCircle2 className="h-4 w-4" /></button>
                    <button onClick={() => reviewTimeOff(r.id, "denied", me?.id ?? "")} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50" title="Deny"><XCircle className="h-4 w-4" /></button>
                  </li>
                ))}
                {pendingTrades.slice(0, 2).map((t) => (
                  <li key={t.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800">
                    <StaffAvatar name={staffName(t.requestedBy)} color={getStaff(t.requestedBy)?.avatarColor ?? "#0E7490"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{staffName(t.requestedBy)}</p>
                      <p className="truncate text-xs text-slate-400">Trade · {t.requestedTo ? `to ${staffName(t.requestedTo)}` : "open"}</p>
                    </div>
                    <button onClick={() => reviewTrade(t.id, "approved")} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50" title="Approve"><CheckCircle2 className="h-4 w-4" /></button>
                    <button onClick={() => reviewTrade(t.id, "denied")} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50" title="Deny"><XCircle className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </PermissionGate>

        {/* Compliance */}
        <PermissionGate anyOf={["certifications.view", "chemicals.view"]}>
          <SectionCard title="Compliance watch" subtitle="Certifications & chemicals"
            actions={<Link href="/certifications" className="text-sm font-medium text-brand-700 hover:text-brand-800">All</Link>}>
            {allStaff.length === 0 ? (
              <Empty>No chemical readings logged yet.</Empty>
            ) : certRisk.length === 0 ? (
              <Empty>All certifications current.</Empty>
            ) : (
              <ul className="space-y-2.5">
                {certRisk.slice(0, 4).map((c) => {
                  const meta = certStatusMeta(c.status);
                  const d = c.expiresDate ? daysUntil(c.expiresDate) : null;
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{staffName(c.staffId)}</p>
                        <p className="truncate text-xs text-slate-400">{CERT_TYPE_LABELS[c.type]}{d !== null && ` · ${d < 0 ? `${Math.abs(d)}d overdue` : `${d}d left`}`}</p>
                      </div>
                      <StatusBadge {...meta} />
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </PermissionGate>

        {/* Onboarding */}
        <PermissionGate anyOf={["onboarding.view"]}>
          <SectionCard title="Onboarding in progress" subtitle={`${onboardingStaff.length} staff`}
            actions={<Link href="/settings/users" className="text-sm font-medium text-brand-700 hover:text-brand-800">Users</Link>}>
            {allStaff.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-400 dark:text-slate-500">No staff onboarded yet.</p>
                <Link href="/settings/users" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800">
                  <UserPlus className="h-4 w-4" /> Invite your team from Users &amp; Access
                </Link>
              </div>
            ) : onboardingStaff.length === 0 ? (
              <Empty>Everyone is fully onboarded 🎉</Empty>
            ) : (
              <ul className="space-y-3">
                {onboardingStaff.slice(0, 4).map((s) => (
                  <li key={s.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                        {s.firstName} {s.lastName}
                        {s.isMinor && <span className="chip bg-amber-50 text-amber-700">Minor</span>}
                      </span>
                      <span className="text-xs text-slate-400">{s.onboardingComplete}%</span>
                    </div>
                    <ProgressBar value={s.onboardingComplete} className="mt-1.5" size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </PermissionGate>

        {/* Maintenance */}
        <PermissionGate anyOf={["maintenance.view"]}>
          <SectionCard title="Maintenance" subtitle={`${openIssues.length} open issues`}
            actions={<Link href="/maintenance" className="text-sm font-medium text-brand-700 hover:text-brand-800">Board</Link>}>
            {openIssues.length === 0 ? (
              <Empty>Nothing reported yet.</Empty>
            ) : (
              <ul className="space-y-2.5">
                {openIssues.slice(0, 4).map((i) => (
                  <li key={i.id} className="flex items-start gap-2.5">
                    <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{i.title}</p>
                      <p className="truncate text-xs text-slate-400">{facilityName(i.facilityId)} · {i.area}</p>
                    </div>
                    <StatusBadge {...priorityMeta(i.priority)} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </PermissionGate>

        {/* Announcements */}
        <PermissionGate anyOf={["chat.view"]}>
          <SectionCard title="Recent announcements" subtitle="All-staff channel"
            actions={<Link href="/chat" className="text-sm font-medium text-brand-700 hover:text-brand-800">Open</Link>}>
            {announcements.length === 0 ? (
              <Empty>No announcements yet.</Empty>
            ) : (
              <ul className="space-y-3">
                {announcements.map((m) => (
                  <li key={m.id} className="flex gap-2.5">
                    <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 line-clamp-2 dark:text-slate-300">{m.body}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{staffName(m.senderId)} · {relativeTime(m.sentAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </PermissionGate>

        {/* Lessons (only if the module is on for this tenant) */}
        {lessonsOn && (
          <PermissionGate anyOf={["lessons.view"]}>
            <SectionCard title="Upcoming lessons" subtitle="Classes & rosters"
              actions={<Link href="/lessons" className="text-sm font-medium text-brand-700 hover:text-brand-800">All</Link>}>
              {upcomingLessons.length === 0 ? (
                <Empty>No lessons scheduled yet.</Empty>
              ) : (
                <ul className="space-y-2.5">
                  {upcomingLessons.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{l.name}</p>
                        <p className="truncate text-xs text-slate-400">{l.dayOfWeek} · {format24h(l.start)} · {staffName(l.instructorId)}</p>
                      </div>
                      <span className="chip bg-slate-100 text-slate-600">{l.enrolled}/{l.capacity}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </PermissionGate>
        )}

        {/* Payroll (only if the module is on for this tenant) */}
        {payrollOn && (
          <PermissionGate anyOf={["payroll.view"]}>
            <SectionCard title="Payroll readiness" subtitle="Current pay period"
              actions={<Link href="/payroll" className="text-sm font-medium text-brand-700 hover:text-brand-800">Open</Link>}>
              {allStaff.length === 0 ? (
                <Empty>No timesheets yet.</Empty>
              ) : (
                <>
                  <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                    <Wallet className="h-8 w-8 text-brand-600" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{missingForms.length} staff need review</p>
                      <p className="text-xs text-slate-400">Missing punches &amp; overtime to confirm</p>
                    </div>
                  </div>
                  <Link href="/payroll" className="btn-secondary mt-3 w-full">Review timesheets <ArrowRight className="h-4 w-4" /></Link>
                </>
              )}
            </SectionCard>
          </PermissionGate>
        )}
      </div>
    </div>
  );
}
