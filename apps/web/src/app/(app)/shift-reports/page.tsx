"use client";

import { useMemo, useState } from "react";
import { FileText, CloudSun, Users, AlertTriangle, Wrench, Package } from "lucide-react";
import { facilityName, staffName, getStaff, formatDate, type ShiftReport } from "@poolops/shared";
import { useAccess, useMyStaffId, useStaffProfileState } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { useTenantSeed } from "@/lib/tenant-data";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { UnlinkedStaffNotice } from "@/components/shell/unlinked-staff-notice";
import { StaffAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";

const REVIEW_INTENT = { submitted: "info", reviewed: "success", flagged: "danger" } as const;

export default function ShiftReportsPage() {
  const { can, facilityId } = useAccess();
  const myStaffId = useMyStaffId();
  const profileState = useStaffProfileState();
  const { facilities } = useTenantSeed();
  const storeReports = useDemo((s) => s.reports);
  const setReportStatus = useDemo((s) => s.setReportStatus);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  // Only a reviewer/admin sees ALL reports; a front-line lifeguard sees only their
  // OWN. (Server-side RLS enforces the same — shift-reports-rls.sql.) No demo-data
  // fallback: a real tenant with no reports shows an empty state.
  const seesAll = can("shiftreports.review");

  const reports = useMemo(() => {
    return storeReports
      .filter((r) => seesAll || r.staffId === myStaffId)
      .filter((r) => facilityId === "all" || r.facilityId === facilityId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [storeReports, facilityId, seesAll, myStaffId]);

  if (!can("shiftreports.view") && !can("shiftreports.submit")) return <AccessRestricted />;

  // A real staff account with no linked profile can't file/own reports — fail loudly.
  if (profileState === "unlinked" && !seesAll) {
    return (
      <div className="space-y-6">
        <PageHeader title="Shift Reports" subtitle="End-of-shift handoffs." />
        <UnlinkedStaffNotice />
      </div>
    );
  }

  const selected = reports.find((r) => r.id === activeId) ?? reports[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shift Reports"
        subtitle={seesAll ? "End-of-shift handoffs across the team: weather, staffing, incidents, maintenance." : "Your end-of-shift handoffs."}
        actions={can("shiftreports.submit") ? <Button icon="FileText" onClick={() => setComposing(true)}>New report</Button> : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <SectionCard title="Reports" subtitle={`${reports.length} ${seesAll ? "total" : "of yours"}`} bodyClassName="p-2">
          <div className="space-y-1">
            {reports.map((r) => (
              <button key={r.id} onClick={() => setActiveId(r.id)}
                className={cn("flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors", selected?.id === r.id ? "bg-brand-50/60 dark:bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800")}>
                <StaffAvatar name={staffName(r.staffId)} color={getStaff(r.staffId)?.avatarColor ?? "#0E7490"} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{r.shiftLabel}</p>
                  <p className="truncate text-xs text-slate-400">{facilityName(r.facilityId)} · {formatDate(r.date)}</p>
                </div>
                <Badge intent={REVIEW_INTENT[r.reviewStatus]}>{r.reviewStatus}</Badge>
              </button>
            ))}
            {reports.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No shift reports yet.</p>}
          </div>
        </SectionCard>

        {selected ? (
          <ReportDetail r={selected} canReview={can("shiftreports.review")} onReview={(status) => setReportStatus(selected.id, status)} />
        ) : (
          <SectionCard title="Report"><p className="py-8 text-center text-sm text-slate-400">{can("shiftreports.submit") ? "File a report with “New report”." : "Select a report."}</p></SectionCard>
        )}
      </div>

      {composing && (
        <NewReportModal
          facilities={facilities}
          onClose={() => setComposing(false)}
          onSubmit={(r) => { useDemo.getState().addReport({ ...r, staffId: myStaffId ?? "staff", reviewStatus: "submitted" }); setComposing(false); }}
        />
      )}
    </div>
  );
}

function ReportDetail({ r, canReview, onReview }: { r: ShiftReport; canReview: boolean; onReview: (status: ShiftReport["reviewStatus"]) => void }) {
  const fields: { icon: typeof CloudSun; label: string; value: string }[] = [
    { icon: CloudSun, label: "Weather", value: r.weather },
    { icon: Users, label: "Staffing", value: r.staffingNotes },
    { icon: AlertTriangle, label: "Incidents", value: r.incidents },
    { icon: Wrench, label: "Maintenance concerns", value: r.maintenanceConcerns },
    { icon: Users, label: "Patron issues", value: r.patronIssues },
    { icon: Package, label: "Supplies needed", value: r.suppliesNeeded },
  ];
  return (
    <SectionCard
      title={r.shiftLabel}
      subtitle={`${facilityName(r.facilityId)} · ${formatDate(r.date)} · ${staffName(r.staffId)}`}
      actions={<Badge intent={REVIEW_INTENT[r.reviewStatus]}>{r.reviewStatus}</Badge>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400"><f.icon className="h-3.5 w-3.5" /> {f.label}</p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{f.value || "—"}</p>
          </div>
        ))}
      </div>
      {r.managerNotes && (
        <div className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
          <p className="text-xs font-semibold uppercase tracking-wide">Manager notes</p>
          <p className="mt-1">{r.managerNotes}</p>
        </div>
      )}
      {canReview && r.reviewStatus === "submitted" && (
        <div className="mt-4 flex gap-2">
          <Button onClick={() => onReview("reviewed")} icon="Check">Mark reviewed</Button>
          <Button variant="secondary" onClick={() => onReview("flagged")}>Flag for follow-up</Button>
        </div>
      )}
    </SectionCard>
  );
}

type NewReport = Omit<ShiftReport, "id" | "staffId" | "reviewStatus">;

function NewReportModal({ facilities, onClose, onSubmit }: {
  facilities: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (r: NewReport) => void;
}) {
  const [form, setForm] = useState<NewReport>({
    facilityId: facilities[0]?.id ?? "",
    shiftLabel: "",
    date: new Date().toISOString().slice(0, 10),
    weather: "", staffingNotes: "", incidents: "", maintenanceConcerns: "", patronIssues: "", suppliesNeeded: "",
  });
  const set = (k: keyof NewReport, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal open onClose={onClose} title="New shift report" description="End-of-shift handoff. It's filed under your name." size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon="FileText" onClick={() => onSubmit(form)} disabled={!form.shiftLabel.trim()}>Submit report</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Shift label" required><Input value={form.shiftLabel} onChange={(e) => set("shiftLabel", e.target.value)} placeholder="Morning open" /></Field>
          <Field label="Date"><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
          {facilities.length > 1 && <Field label="Facility"><Select value={form.facilityId} onChange={(e) => set("facilityId", e.target.value)}>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Weather"><Input value={form.weather} onChange={(e) => set("weather", e.target.value)} placeholder="Sunny, 84°F" /></Field>
          <Field label="Staffing"><Input value={form.staffingNotes} onChange={(e) => set("staffingNotes", e.target.value)} placeholder="Full coverage" /></Field>
          <Field label="Incidents"><Textarea value={form.incidents} onChange={(e) => set("incidents", e.target.value)} placeholder="None" /></Field>
          <Field label="Maintenance concerns"><Textarea value={form.maintenanceConcerns} onChange={(e) => set("maintenanceConcerns", e.target.value)} placeholder="None" /></Field>
          <Field label="Patron issues"><Textarea value={form.patronIssues} onChange={(e) => set("patronIssues", e.target.value)} placeholder="None" /></Field>
          <Field label="Supplies needed"><Textarea value={form.suppliesNeeded} onChange={(e) => set("suppliesNeeded", e.target.value)} placeholder="None" /></Field>
        </div>
      </div>
    </Modal>
  );
}
