"use client";

import { useMemo, useState } from "react";
import { FileText, CloudSun, Users, AlertTriangle, Wrench, Package } from "lucide-react";
import {
  shiftReports, facilityName, staffName, getStaff, formatDate, type ShiftReport,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { StaffAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

const REVIEW_INTENT = { submitted: "info", reviewed: "success", flagged: "danger" } as const;

export default function ShiftReportsPage() {
  const { can, facilityId } = useAccess();
  const storeReports = useDemo((s) => s.reports);
  const [activeId, setActiveId] = useState<string | null>(null);

  const reports = useMemo(() => {
    const all = storeReports.length ? storeReports : shiftReports;
    return all
      .filter((r) => facilityId === "all" || r.facilityId === facilityId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [storeReports, facilityId]);

  if (!can("shiftreports.view") && !can("shiftreports.submit")) return <AccessRestricted />;

  const selected = reports.find((r) => r.id === activeId) ?? reports[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shift Reports"
        subtitle="End-of-shift handoffs: weather, staffing, incidents, and maintenance concerns."
        actions={can("shiftreports.submit") ? <button className="btn-primary"><FileText className="h-4 w-4" /> New report</button> : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <SectionCard title="Reports" subtitle={`${reports.length} total`} bodyClassName="p-2">
          <div className="space-y-1">
            {reports.map((r) => (
              <button key={r.id} onClick={() => setActiveId(r.id)}
                className={cn("flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors", selected?.id === r.id ? "bg-brand-50/60" : "hover:bg-slate-50")}>
                <StaffAvatar name={staffName(r.staffId)} color={getStaff(r.staffId)?.avatarColor ?? "#0E7490"} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{r.shiftLabel}</p>
                  <p className="truncate text-xs text-slate-400">{facilityName(r.facilityId)} · {formatDate(r.date)}</p>
                </div>
                <Badge intent={REVIEW_INTENT[r.reviewStatus]}>{r.reviewStatus}</Badge>
              </button>
            ))}
            {reports.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No shift reports yet.</p>}
          </div>
        </SectionCard>

        {selected ? <ReportDetail r={selected} canReview={can("shiftreports.review")} /> : (
          <SectionCard title="Report"><p className="py-8 text-center text-sm text-slate-400">Select a report.</p></SectionCard>
        )}
      </div>
    </div>
  );
}

function ReportDetail({ r, canReview }: { r: ShiftReport; canReview: boolean }) {
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
          <div key={f.label} className="rounded-xl border border-slate-100 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400"><f.icon className="h-3.5 w-3.5" /> {f.label}</p>
            <p className="mt-1 text-sm text-slate-700">{f.value || "—"}</p>
          </div>
        ))}
      </div>
      {r.managerNotes && (
        <div className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <p className="text-xs font-semibold uppercase tracking-wide">Manager notes</p>
          <p className="mt-1">{r.managerNotes}</p>
        </div>
      )}
      {canReview && r.reviewStatus === "submitted" && (
        <div className="mt-4 flex gap-2">
          <button className="btn-primary">Mark reviewed</button>
          <button className="btn-secondary">Flag for follow-up</button>
        </div>
      )}
    </SectionCard>
  );
}
