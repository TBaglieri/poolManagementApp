"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles, Wand2, RefreshCw, CheckCircle2, CalendarCheck, ShieldCheck, Clock,
  CalendarX2, ArrowRight, MessageSquare,
} from "lucide-react";
import {
  facilities, staff as seedStaff, staffCertifications, timeOffRequests,
  formatShortDate, type ID,
} from "@poolops/shared";
import {
  generateScheduleDraft, demoStaffingTemplates, buildDemoTimeOff, demoPriorHours,
  applyScenarioStaff, mondayOf, type GenerateSettings, type SchedulePriority,
} from "@poolops/scheduling";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ScheduleDraftCalendar } from "./schedule-draft-calendar";
import { ScheduleWarningsPanel } from "./schedule-warnings-panel";
import { StaffHoursSummary } from "./staff-hours-summary";
import { PublishScheduleModal } from "./publish-schedule-modal";
import { DRAFT_STATUS_META } from "./draft-status";
import { cn } from "@/lib/cn";

const WEEK_OPTIONS = [
  { value: 1, label: "Next week" },
  { value: 2, label: "In two weeks" },
  { value: 0, label: "This week" },
];

function weekLabel(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start); end.setDate(end.getDate() + 6);
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

export function AutoScheduleBuilder() {
  const { staff: me } = useAccess();
  const drafts = useDemo((s) => s.drafts);
  const addDraft = useDemo((s) => s.addDraft);
  const updateDraftShift = useDemo((s) => s.updateDraftShift);
  const publishDraft = useDemo((s) => s.publishDraft);

  const [weeksAhead, setWeeksAhead] = useState(1);
  const [facilityId, setFacilityId] = useState<ID | "all">("all");
  const [priority, setPriority] = useState<SchedulePriority>("balanced");
  const [includeOpen, setIncludeOpen] = useState(true);
  const [avoidOt, setAvoidOt] = useState(false);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [published, setPublished] = useState(false);
  const [generating, setGenerating] = useState(false);

  const draft = useMemo(() => drafts.find((d) => d.id === draftId) ?? null, [drafts, draftId]);

  const liveMetrics = useMemo(() => {
    if (!draft) return null;
    const total = draft.shifts.length;
    const filled = draft.shifts.filter((s) => s.assignedStaffId).length;
    return { total, filled, open: total - filled, coverage: total ? Math.round((filled / total) * 100) : 100 };
  }, [draft]);

  const generate = () => {
    setGenerating(true);
    const weekStart = mondayOf(weeksAhead);
    const settings: GenerateSettings = {
      facilityId, weekStart, templateId: "tmpl_summer",
      includeOpenShifts: includeOpen, priority, avoidOvertime: avoidOt, maxHoursDefault: 40,
    };
    const approvedTimeOff = [
      ...buildDemoTimeOff(weekStart),
      ...timeOffRequests.filter((r) => r.status === "approved"),
    ];
    // Small timeout so the button shows a working state; algorithm is synchronous.
    setTimeout(() => {
      const result = generateScheduleDraft({
        facilities, template: demoStaffingTemplates[0], staff: applyScenarioStaff(seedStaff),
        approvedTimeOff, certifications: staffCertifications, settings,
        generatedBy: me?.id ?? "staff_director", priorHours: demoPriorHours,
      });
      addDraft(result);
      setDraftId(result.id);
      setPublished(false);
      setGenerating(false);
    }, 350);
  };

  const doPublish = () => {
    if (!draft) return;
    publishDraft(draft.id, me?.id ?? "staff_director");
    setPublishOpen(false);
    setPublished(true);
  };

  const timeOffAvoided = draft?.avoidedConflicts.filter((c) => c.type === "time_off").length ?? 0;
  const certAvoided = draft?.avoidedConflicts.filter((c) => c.type === "missing_cert").length ?? 0;
  const statusMeta = draft ? DRAFT_STATUS_META[published ? "published" : draft.status] : null;

  return (
    <div className="space-y-6">
      {/* Settings */}
      <SectionCard
        title="Generate next week's schedule"
        subtitle="The builder honours time off, availability, certifications, coverage rules, and hour limits."
        icon={<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Wand2 className="h-4 w-4" /></span>}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Week to generate">
            <Select value={weeksAhead} onChange={(e) => setWeeksAhead(Number(e.target.value))}>
              {WEEK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} · {weekLabel(mondayOf(o.value))}</option>)}
            </Select>
          </Field>
          <Field label="Facility">
            <Select value={facilityId} onChange={(e) => setFacilityId(e.target.value as ID | "all")}>
              <option value="all">All facilities</option>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </Field>
          <Field label="Optimize for">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as SchedulePriority)}>
              <option value="balanced">Balanced hours (fairness)</option>
              <option value="preferences">Staff preferences</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <Toggle label="Create open shifts for uncovered slots" checked={includeOpen} onChange={setIncludeOpen} />
          <Toggle label="Avoid overtime where possible" checked={avoidOt} onChange={setAvoidOt} />
        </div>
        <div className="mt-5 flex items-center gap-3">
          <Button icon="Sparkles" onClick={generate} loading={generating} size="lg">
            {draft ? "Regenerate draft" : "Generate draft schedule"}
          </Button>
          <span className="text-xs text-slate-400">Staffing template: <strong>Standard Summer Coverage</strong></span>
        </div>
      </SectionCard>

      {published && draft && (
        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white"><CheckCircle2 className="h-6 w-6" /></span>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900">Schedule published 🎉</h3>
              <p className="mt-1 text-sm text-slate-600">
                {liveMetrics?.filled} shifts are now live for the week of {weekLabel(draft.weekStart)}. Assigned staff were notified, and a “Schedule published” announcement was posted to All Team.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/schedule" className="btn-primary">View published schedule <ArrowRight className="h-4 w-4" /></Link>
                <Link href="/chat" className="btn-secondary"><MessageSquare className="h-4 w-4" /> See All Team announcement</Link>
                <Link href="/m/manager" className="btn-secondary"><CalendarCheck className="h-4 w-4" /> Mobile manager view</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {draft && liveMetrics && (
        <>
          {/* Result summary */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Coverage score</p>
                {statusMeta && <Badge intent={statusMeta.intent}>{statusMeta.label}</Badge>}
              </div>
              <p className={cn("mt-2 text-3xl font-bold", liveMetrics.coverage >= 90 ? "text-emerald-600" : liveMetrics.coverage >= 70 ? "text-amber-600" : "text-rose-600")}>
                {liveMetrics.coverage}%
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className={cn("h-full rounded-full", liveMetrics.coverage >= 90 ? "bg-emerald-500" : liveMetrics.coverage >= 70 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${liveMetrics.coverage}%` }} />
              </div>
            </div>
            <StatMini icon={CalendarCheck} label="Shifts filled" value={`${liveMetrics.filled}/${liveMetrics.total}`} tone="brand" />
            <StatMini icon={CalendarX2} label="Open / unfilled" value={liveMetrics.open} tone={liveMetrics.open > 0 ? "warning" : "success"} />
            <StatMini icon={ShieldCheck} label="Time off respected" value={timeOffAvoided} tone="success" />
          </div>

          {/* Conflicts avoided callout */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <strong>{timeOffAvoided} approved time-off request{timeOffAvoided !== 1 ? "s were" : " was"} avoided</strong> in this draft
            {certAvoided > 0 && <> · <strong>{certAvoided}</strong> staff excluded for expired/missing certifications</>}.
            No one was scheduled during approved time off, outside their availability, or double-booked.
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <SectionCard className="lg:col-span-2" title="Draft schedule" subtitle={weekLabel(draft.weekStart)}
              actions={<Button variant="secondary" icon="RefreshCw" size="sm" onClick={generate} loading={generating}>Regenerate</Button>}>
              <ScheduleDraftCalendar draft={draft} editable onReassign={(sid, staff) => updateDraftShift(draft.id, sid, staff)} />
              <p className="mt-3 text-xs text-slate-400">Tip: use the dropdowns to manually adjust assignments before publishing.</p>
            </SectionCard>

            <div className="space-y-6">
              <SectionCard title="Warnings" subtitle={`${draft.warnings.length} flagged`}>
                <ScheduleWarningsPanel warnings={draft.warnings} />
              </SectionCard>
            </div>

            <SectionCard title="Staff hours" subtitle="Projected for the week">
              <StaffHoursSummary totals={draft.staffHourTotals} maxHours={draft.settings.maxHoursDefault} />
            </SectionCard>

            <SectionCard title="Suggested fixes" subtitle="Before you publish">
              <ul className="space-y-2 text-sm text-slate-600">
                {draft.suggestedFixes.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /> {f}
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="Open shifts" subtitle="Suggested for pick-up">
              {draft.shifts.filter((s) => !s.assignedStaffId).length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">Every slot is covered.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {draft.shifts.filter((s) => !s.assignedStaffId).slice(0, 8).map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2">
                      <span className="min-w-0 truncate text-slate-700">{s.label}</span>
                      <span className="shrink-0 text-xs text-slate-400">{s.date.slice(5)} · {s.start}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          {/* Publish bar */}
          <div className="sticky bottom-4 z-10 flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lift backdrop-blur sm:flex-row">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-slate-400" />
              <p className="text-sm text-slate-600">This is a <strong>draft</strong> — nothing is sent until you publish.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/schedule/drafts" className="btn-secondary">Save &amp; review later</Link>
              <Button icon="Send" onClick={() => setPublishOpen(true)} disabled={published}>
                {published ? "Published" : "Approve & publish"}
              </Button>
            </div>
          </div>

          <PublishScheduleModal open={publishOpen} onClose={() => setPublishOpen(false)} draft={draft} onConfirm={doPublish} />
        </>
      )}

      {!draft && (
        <SectionCard title="What the auto builder accounts for">
          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            {[
              "Approved vacation & time-off requests", "Individual staff availability",
              "Roles & required certifications", "Facility staffing requirements & hours",
              "Required lifeguard & head-guard coverage", "Swim-lesson instructor needs",
              "Preferred min/max hours & fairness", "Double-booking avoidance",
              "Overtime risk flags", "Under-18 minor labor-rule flags",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t}</div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2.5 text-sm">
      <span className={cn("relative h-5 w-9 rounded-full transition-colors", checked ? "bg-brand-600" : "bg-slate-300")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", checked ? "left-4" : "left-0.5")} />
      </span>
      <span className="text-slate-700">{label}</span>
    </button>
  );
}

function StatMini({ icon: Icon, label, value, tone }: { icon: typeof Clock; label: string; value: React.ReactNode; tone: "brand" | "warning" | "success" }) {
  const cls = tone === "warning" ? "bg-amber-50 text-amber-600" : tone === "success" ? "bg-emerald-50 text-emerald-600" : "bg-brand-50 text-brand-600";
  return (
    <div className="card p-5">
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", cls)}><Icon className="h-5 w-5" /></span>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
