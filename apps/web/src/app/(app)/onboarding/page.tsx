"use client";

import { useMemo } from "react";
import { ShieldAlert, FileText, Check, Circle, Clock, Lock } from "lucide-react";
import {
  onboardingTasks, facilityName,
  ONBOARDING_STEP_LABELS, SUBMISSION_STATUS_LABELS,
  type OnboardingStepKey, type SubmissionStatus,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useTenantSeed } from "@/lib/tenant-data";
import { useDemo } from "@/lib/store";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StaffAvatar } from "@/components/ui/avatar";
import { Badge, RoleBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { AlertCard } from "@/components/ui/alert-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const TAX_DOCS = ["W-4", "I-9", "State tax form", "Direct deposit", "Handbook acknowledgment"];

export default function OnboardingPage() {
  const { can, staff: me } = useAccess();
  const { staff: seedStaff } = useTenantSeed();
  const submissions = useDemo((s) => s.onboarding);
  const setStep = useDemo((s) => s.setOnboardingStep);

  const isAdmin = can("onboarding.view");

  const productionWarning = (
    <AlertCard intent="warning" icon="ShieldAlert" title="Secure document collection placeholder">
      Verify legal/tax compliance before production use. Sensitive tax documents require encrypted storage, strict
      role-based access control, audit logs, retention policies, legal review, and secure file handling.
    </AlertCard>
  );

  if (isAdmin) {
    const inProgress = seedStaff.filter((s) => s.onboardingComplete < 100);
    const blocked = seedStaff.filter((s) => s.statusFlags.includes("missing_forms"));
    const avg = seedStaff.length ? Math.round(seedStaff.reduce((a, s) => a + s.onboardingComplete, 0) / seedStaff.length) : 0;

    const columns: Column<typeof seedStaff[number]>[] = [
      { key: "name", header: "Staff", render: (s) => (
        <div className="flex items-center gap-3">
          <StaffAvatar name={`${s.firstName} ${s.lastName}`} color={s.avatarColor} size="sm" />
          <div><p className="font-medium text-slate-800">{s.firstName} {s.lastName}{s.isMinor && <Badge intent="warning" className="ml-1.5">Minor</Badge>}</p><p className="text-xs text-slate-400">{facilityName(s.homeFacilityId)}</p></div>
        </div>
      ) },
      { key: "role", header: "Role", hideOnMobile: true, render: (s) => <RoleBadge role={s.primaryRole} /> },
      { key: "progress", header: "Progress", render: (s) => <div className="w-32"><ProgressBar value={s.onboardingComplete} size="sm" showLabel /></div> },
      { key: "docs", header: "Documents", hideOnMobile: true, render: (s) => <span className="text-sm text-slate-600">{s.documentsSubmitted}/{s.documentsRequired}</span> },
      { key: "status", header: "Status", render: (s) => s.onboardingComplete === 100 ? <Badge intent="success">Complete</Badge> : s.statusFlags.includes("missing_forms") ? <Badge intent="warning">Missing forms</Badge> : <Badge intent="info">In progress</Badge> },
    ];

    return (
      <div className="space-y-6">
        <PageHeader title="Onboarding" subtitle="Track new-hire progress, documents, and compliance." />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="In progress" value={inProgress.length} icon="ClipboardList" intent="info" />
          <StatCard label="Blocked / missing forms" value={blocked.length} icon="FileWarning" intent="warning" />
          <StatCard label="Avg completion" value={`${avg}%`} icon="TrendingUp" intent="brand" />
          <StatCard label="Fully onboarded" value={seedStaff.filter((s) => s.onboardingComplete === 100).length} icon="UserCheck" intent="success" />
        </div>
        {productionWarning}
        <SectionCard title="Completion tracker" subtitle={`${inProgress.length} staff still onboarding`}>
          <DataTable columns={columns} rows={seedStaff} getKey={(s) => s.id}
            empty={{ title: "No staff onboarded yet", description: "Invite your team from Users & Access to start tracking onboarding.", icon: "ClipboardList" }} />
        </SectionCard>
        <SectionCard title="Onboarding steps" subtitle="Required workflow for every new hire">
          <ol className="grid gap-3 sm:grid-cols-2">
            {onboardingTasks.map((t, i) => (
              <li key={t.key} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{t.title}{!t.required && <span className="ml-1 text-xs text-slate-400">(optional)</span>}</p>
                  <p className="text-xs text-slate-400">{t.description}</p>
                  {t.documents && <div className="mt-1 flex flex-wrap gap-1">{t.documents.map((d) => <span key={d} className="chip bg-slate-100 text-slate-500">{d}</span>)}</div>}
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>
    );
  }

  // Staff self-service onboarding
  const mySubs = submissions.filter((s) => s.staffId === me?.id);
  const statusOf = (key: OnboardingStepKey): SubmissionStatus =>
    mySubs.find((s) => s.step === key)?.status ?? "not_started";
  const done = onboardingTasks.filter((t) => ["submitted", "approved"].includes(statusOf(t.key))).length;
  const pct = Math.round((done / onboardingTasks.length) * 100);

  return (
    <div className="space-y-6">
      <PageHeader title="My Onboarding" subtitle="Complete these steps before your first shift." />
      <SectionCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">{pct}% complete</p>
            <p className="text-xs text-slate-400">{done} of {onboardingTasks.length} steps done</p>
          </div>
          {me?.isMinor && <Badge intent="warning">Minor — work permit required</Badge>}
        </div>
        <ProgressBar value={pct} className="mt-3" />
      </SectionCard>

      {productionWarning}

      <SectionCard title="Your steps">
        <ol className="space-y-2.5">
          {onboardingTasks.map((t, i) => {
            const st = statusOf(t.key);
            const complete = st === "submitted" || st === "approved";
            return (
              <li key={t.key} className={cn("flex items-center gap-3 rounded-xl border p-3", complete ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200")}>
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", complete ? "bg-emerald-500 text-white" : st === "in_progress" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400")}>
                  {complete ? <Check className="h-4 w-4" /> : st === "in_progress" ? <Clock className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{i + 1}. {t.title}</p>
                  <p className="text-xs text-slate-400">{t.description}</p>
                </div>
                <Badge intent={complete ? "success" : st === "in_progress" ? "warning" : "neutral"}>{SUBMISSION_STATUS_LABELS[st]}</Badge>
                {!complete && me && (
                  <Button size="sm" onClick={() => setStep(me.id, t.key, "submitted")}>{st === "in_progress" ? "Finish" : "Start"}</Button>
                )}
              </li>
            );
          })}
        </ol>
      </SectionCard>

      <SectionCard title="Tax & employment documents" icon={<FileText className="h-4 w-4 text-slate-400" />}>
        <div className="flex flex-wrap gap-2">
          {TAX_DOCS.map((d) => <span key={d} className="chip bg-slate-100 text-slate-600"><Lock className="h-3 w-3" /> {d}</span>)}
          {me?.isMinor && <span className="chip bg-amber-50 text-amber-700"><Lock className="h-3 w-3" /> Minor work permit</span>}
        </div>
        <p className="mt-3 text-xs text-slate-400">Document upload is a placeholder. Files are not stored. See production notes in SECURITY.md.</p>
      </SectionCard>
    </div>
  );
}
