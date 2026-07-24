"use client";

import Link from "next/link";
import {
  Wrench, Megaphone, Wallet, ArrowRight, CheckCircle2, XCircle, UserPlus,
  AlertTriangle, CalendarX2, Inbox, FileWarning,
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
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge, RoleBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { StaffAvatar } from "@/components/ui/avatar";
import { PermissionGate } from "@/components/ui/permission-gate";
import { TrendArea } from "@/components/charts/charts-lazy";
import { ReadinessBand, type ReadinessSegment } from "@/components/dashboard/readiness-band";
import { facilityStatusMeta, certStatusMeta, priorityMeta } from "@/lib/status";
import { cn } from "@/lib/cn";

/** Tenant-driven avatar fallback (never a hardcoded brand hex). */
const AVATAR_FALLBACK = "rgb(var(--brand-700))";
/** Safety-critical chemistry: an out-of-range value here means "not safe to swim". */
const CRITICAL_KEYS = ["freeChlorine", "combinedChlorine", "ph"];
const takenOf = (c: { takenAt?: string; recordedAt: string }) => c.takenAt ?? c.recordedAt;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** A small, on-brand empty state used inside dashboard widgets. */
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">{children}</p>;
}

/** One prioritized "needs you" row — icon, what happened, and the verb to fix it. */
function ActionRow({
  tone, icon: IconEl, children, href, cta,
}: {
  tone: "danger" | "warn" | "info";
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  href: string;
  cta: string;
}) {
  const tones = {
    danger: "text-rose-600 dark:text-rose-400",
    warn: "text-amber-600 dark:text-amber-400",
    info: "text-brand-600 dark:text-brand-300",
  } as const;
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <IconEl className={cn("h-4 w-4 shrink-0", tones[tone])} />
      <p className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{children}</p>
      <Link href={href} className="btn-secondary shrink-0 px-2.5 py-1.5 text-xs">{cta}</Link>
    </div>
  );
}

export default function DashboardPage() {
  const { staff: me, facilityId, roleMeta, canAny } = useAccess();
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
  const filledToday = todaysShifts.filter((s) => s.assignedStaffId).length;
  const openShifts = shifts.filter((s) => s.status === "open" && facMatch(s.facilityId));
  const hasShifts = todaysShifts.length > 0;
  const coverage = hasShifts ? Math.round((filledToday / todaysShifts.length) * 100) : null;
  const clockedIn = clock.filter((e) => (e.status === "clocked_in" || e.status === "late") && facMatch(e.facilityId));
  const pendingTimeOff = timeOff.filter((r) => r.status === "pending");
  const pendingTrades = trades.filter((t) => t.status === "pending");
  const pendingApprovals = pendingTimeOff.length + pendingTrades.length;
  const missingForms = allStaff.filter((s) => s.statusFlags.includes("missing_forms") && facMatch(s.homeFacilityId));
  const certRisk = staffCertifications.filter((c) => c.status === "expiring" || c.status === "expired");
  const chemWarn = chemicals.filter((c) => c.outOfRange.length > 0 && facMatch(c.facilityId));
  const openIssues = issues.filter((i) => i.status !== "resolved" && facMatch(i.facilityId));
  const onboardingStaff = allStaff.filter((s) => s.onboardingComplete < 100 && facMatch(s.homeFacilityId));

  // Pool safety: each facility's most-recent reading; a safety-critical value out
  // of range means the pool needs action before opening.
  const facs = facilities.filter((f) => facMatch(f.id));
  const poolSafety = facs.map((f) => {
    const latest = chemicals
      .filter((c) => c.facilityId === f.id)
      .slice().sort((a, b) => new Date(takenOf(b)).getTime() - new Date(takenOf(a)).getTime())[0];
    const critical = latest ? latest.outOfRange.filter((k) => CRITICAL_KEYS.includes(k)) : [];
    return { f, latest, critical };
  });
  const unsafePools = poolSafety.filter((p) => p.critical.length > 0);
  const anyReadings = chemicals.length > 0;

  const patronFacility = facilityId === "all" ? facilities[0]?.id : facilityId;
  const patronData = patron
    .filter((p) => p.facilityId === patronFacility && p.timeSlot.includes(":") && new Date(p.recordedAt).toDateString() === new Date().toDateString())
    .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
    .map((p) => ({ slot: format24h(p.timeSlot), count: p.count }));

  const announcements = messages.filter((m) => m.channelId === "ch_all").slice(-3).reverse();
  const upcomingLessons = lessonClasses.filter((l) => facMatch(l.facilityId)).slice(0, 4);
  const orgLabel = facilityId === "all" ? config.displayName : facilityName(facilityId);

  const s = (n: number) => (n === 1 ? "" : "s");
  const asOf = (() => {
    try {
      return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: config.timezone || undefined }).format(new Date());
    } catch { return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  })();

  // ── Readiness: the three-second glance ──────────────────────────────────
  const complianceCount = certRisk.length + chemWarn.length;
  const segments: ReadinessSegment[] = [
    {
      label: "Covered",
      value: coverage === null ? "—" : `${coverage}%`,
      detail: hasShifts ? `${filledToday} of ${todaysShifts.length} shift${s(todaysShifts.length)} filled` : "No shifts scheduled today",
      state: coverage === null ? "neutral" : coverage >= 90 ? "ok" : coverage >= 70 ? "warn" : "danger",
      meter: coverage,
      href: "/schedule",
      cta: openShifts.length ? `Fill ${openShifts.length} open shift${s(openShifts.length)}` : "View schedule",
    },
    {
      label: "Compliant",
      value: complianceCount === 0 ? "All clear" : String(complianceCount),
      detail: complianceCount === 0
        ? (allStaff.length || anyReadings ? "Certifications current · readings in range" : "Nothing to track yet")
        : [certRisk.length ? `${certRisk.length} certification${s(certRisk.length)} due` : "", chemWarn.length ? `${chemWarn.length} reading${s(chemWarn.length)} flagged` : ""].filter(Boolean).join(" · "),
      state: chemWarn.length ? "danger" : certRisk.length ? "warn" : (allStaff.length || anyReadings ? "ok" : "neutral"),
      href: chemWarn.length ? "/chemicals" : "/certifications",
      cta: complianceCount ? "Review" : "View certifications",
    },
    {
      label: "Safe",
      value: unsafePools.length ? `${unsafePools.length} to fix` : anyReadings ? "All clear" : "—",
      detail: unsafePools.length
        ? `${unsafePools.map((p) => p.f.name).join(", ")} out of safe range`
        : anyReadings ? `${facs.length} pool${s(facs.length)} within safe range` : "No readings logged yet",
      state: unsafePools.length ? "danger" : anyReadings ? "ok" : "neutral",
      href: "/chemicals",
      cta: unsafePools.length ? "Close & correct" : anyReadings ? "View pool status" : "Log a reading",
    },
  ];

  // ── Needs you: only what needs a decision, in priority order ────────────
  const canApprove = canAny(["schedule.approve"]); // same permission the queue card uses
  const showApprovals = canApprove && pendingApprovals > 0;
  const hasActions = chemWarn.length > 0 || openShifts.length > 0 || showApprovals || missingForms.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${displayName}`}
        subtitle={`Here's where ${orgLabel} stands today.`}
        actions={roleMeta && <RoleBadge role={roleMeta.slug} />}
      />

      <ReadinessBand segments={segments} asOf={asOf} />

      {/* Needs you — progressive disclosure: rows appear only when there's something to do. */}
      <section className="card overflow-hidden">
        <header className="flex items-center justify-between px-5 pt-4 pb-1">
          <p className="eyebrow">Needs you</p>
          {clockedIn.length > 0 && <p className="caption tnum">{clockedIn.length} on shift now</p>}
        </header>
        {hasActions ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {chemWarn.length > 0 && (
              <ActionRow tone="danger" icon={AlertTriangle} href="/chemicals" cta="Review">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{chemWarn.length} reading{s(chemWarn.length)} out of range</span>
                {" "}— {facilityName(chemWarn[0].facilityId)} flagged. Correct before reopening.
              </ActionRow>
            )}
            {openShifts.length > 0 && (
              <ActionRow tone="warn" icon={CalendarX2} href="/schedule" cta="Fill shifts">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{openShifts.length} open shift{s(openShifts.length)}</span> still need a guard.
              </ActionRow>
            )}
            {showApprovals && (
              <ActionRow tone="info" icon={Inbox} href="/schedule" cta="Open queue">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{pendingApprovals} approval{s(pendingApprovals)} waiting</span> — time-off &amp; shift trades.
              </ActionRow>
            )}
            {missingForms.length > 0 && (
              <ActionRow tone="warn" icon={FileWarning} href="/settings/users" cta="Review">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{missingForms.length} staff</span> missing onboarding forms.
              </ActionRow>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-5 pb-4 pt-1 text-sm text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            You&apos;re all set — nothing needs your attention right now.
          </div>
        )}
      </section>

      {/* Detail — quieter drill-downs, clearly secondary to the two blocks above. */}
      <div className="pt-1">
        <p className="eyebrow mb-3">Across {orgLabel}</p>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Patron trend */}
          <SectionCard className="lg:col-span-2" title="Patron count trend"
            subtitle={patronFacility ? `${facilityName(patronFacility)} · today by the hour` : "Today by the hour"}
            actions={<Link href="/patron-counts" className="text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300">Details</Link>}>
            {patronData.length > 0 ? (
              <TrendArea data={patronData} xKey="slot" yKey="count" name="Patrons" />
            ) : (
              <Empty>Patron counts show here once your team starts logging them.</Empty>
            )}
          </SectionCard>

          {/* Facility status */}
          <SectionCard title="Facility status" subtitle="Live operations"
            actions={<Link href="/facilities" className="text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300">All</Link>}>
            {facs.length === 0 ? (
              <Empty>No facilities added yet.</Empty>
            ) : (
              <ul className="space-y-3">
                {facs.map((f) => {
                  const meta = facilityStatusMeta(f.status);
                  const here = clock.filter((e) => e.facilityId === f.id && (e.status === "clocked_in" || e.status === "late")).length;
                  return (
                    <li key={f.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{f.name}</p>
                        <p className="caption tnum">{here} clocked in · {staffName(f.managerId)}</p>
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
              actions={<Link href="/schedule" className="text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300">Queue</Link>}>
              {pendingApprovals === 0 ? (
                <Empty>Nothing waiting — approvals will appear here.</Empty>
              ) : (
                <ul className="space-y-2.5">
                  {pendingTimeOff.slice(0, 3).map((r) => (
                    <li key={r.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800">
                      <StaffAvatar name={staffName(r.staffId)} color={getStaff(r.staffId)?.avatarColor ?? AVATAR_FALLBACK} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{staffName(r.staffId)}</p>
                        <p className="caption truncate">Time off · {r.reason}</p>
                      </div>
                      <button onClick={() => reviewTimeOff(r.id, "approved", me?.id ?? "")} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40" title="Approve"><CheckCircle2 className="h-4 w-4" /></button>
                      <button onClick={() => reviewTimeOff(r.id, "denied", me?.id ?? "")} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" title="Deny"><XCircle className="h-4 w-4" /></button>
                    </li>
                  ))}
                  {pendingTrades.slice(0, 2).map((t) => (
                    <li key={t.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5 dark:border-slate-800">
                      <StaffAvatar name={staffName(t.requestedBy)} color={getStaff(t.requestedBy)?.avatarColor ?? AVATAR_FALLBACK} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{staffName(t.requestedBy)}</p>
                        <p className="caption truncate">Trade · {t.requestedTo ? `to ${staffName(t.requestedTo)}` : "open"}</p>
                      </div>
                      <button onClick={() => reviewTrade(t.id, "approved")} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40" title="Approve"><CheckCircle2 className="h-4 w-4" /></button>
                      <button onClick={() => reviewTrade(t.id, "denied")} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" title="Deny"><XCircle className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </PermissionGate>

          {/* Compliance */}
          <PermissionGate anyOf={["certifications.view", "chemicals.view"]}>
            <SectionCard title="Compliance watch" subtitle="Certifications & chemicals"
              actions={<Link href="/certifications" className="text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300">All</Link>}>
              {allStaff.length === 0 ? (
                <Empty>Staff certifications will be tracked here once your team is added.</Empty>
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
                          <p className="caption truncate">{CERT_TYPE_LABELS[c.type]}{d !== null && ` · ${d < 0 ? `${Math.abs(d)}d overdue` : `${d}d left`}`}</p>
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
              actions={<Link href="/settings/users" className="text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300">Users</Link>}>
              {allStaff.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">No staff yet.</p>
                  <Link href="/settings/users" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300">
                    <UserPlus className="h-4 w-4" /> Invite your team
                  </Link>
                </div>
              ) : onboardingStaff.length === 0 ? (
                <Empty>Everyone is fully onboarded.</Empty>
              ) : (
                <ul className="space-y-3">
                  {onboardingStaff.slice(0, 4).map((st) => (
                    <li key={st.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                          {st.firstName} {st.lastName}
                          {st.isMinor && <span className="chip bg-amber-50 text-amber-700">Minor</span>}
                        </span>
                        <span className="caption tnum">{st.onboardingComplete}%</span>
                      </div>
                      <ProgressBar value={st.onboardingComplete} className="mt-1.5" size="sm" />
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </PermissionGate>

          {/* Maintenance */}
          <PermissionGate anyOf={["maintenance.view"]}>
            <SectionCard title="Maintenance" subtitle={`${openIssues.length} open issue${s(openIssues.length)}`}
              actions={<Link href="/maintenance" className="text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300">Board</Link>}>
              {openIssues.length === 0 ? (
                <Empty>Nothing reported — log an issue from the Maintenance board.</Empty>
              ) : (
                <ul className="space-y-2.5">
                  {openIssues.slice(0, 4).map((i) => (
                    <li key={i.id} className="flex items-start gap-2.5">
                      <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{i.title}</p>
                        <p className="caption truncate">{facilityName(i.facilityId)} · {i.area}</p>
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
              actions={<Link href="/chat" className="text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300">Open</Link>}>
              {announcements.length === 0 ? (
                <Empty>No announcements yet — post one to the all-staff channel.</Empty>
              ) : (
                <ul className="space-y-3">
                  {announcements.map((m) => (
                    <li key={m.id} className="flex gap-2.5">
                      <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700 line-clamp-2 dark:text-slate-300">{m.body}</p>
                        <p className="caption mt-0.5">{staffName(m.senderId)} · {relativeTime(m.sentAt)}</p>
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
                actions={<Link href="/lessons" className="text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300">All</Link>}>
                {upcomingLessons.length === 0 ? (
                  <Empty>No lessons scheduled yet.</Empty>
                ) : (
                  <ul className="space-y-2.5">
                    {upcomingLessons.map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{l.name}</p>
                          <p className="caption truncate">{l.dayOfWeek} · {format24h(l.start)} · {staffName(l.instructorId)}</p>
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
                actions={<Link href="/payroll" className="text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300">Open</Link>}>
                {allStaff.length === 0 ? (
                  <Empty>Timesheets appear here once staff start clocking in.</Empty>
                ) : (
                  <>
                    <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                      <Wallet className="h-8 w-8 text-brand-600" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{missingForms.length} staff need review</p>
                        <p className="caption">Missing punches &amp; overtime to confirm</p>
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
    </div>
  );
}
