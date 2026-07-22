"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, Camera, CalendarClock, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import {
  inspectionTemplates, inspectionResults, facilityName, staffName, relativeTime,
  INSPECTION_FEATURE_LABELS, type InspectionResult,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

const RESULT_META = {
  pass: { intent: "success" as const, icon: CheckCircle2, label: "Pass" },
  needs_attention: { intent: "warning" as const, icon: AlertTriangle, label: "Needs Attention" },
  fail: { intent: "danger" as const, icon: XCircle, label: "Fail" },
};

export default function InspectionsPage() {
  const { can, facilityId } = useAccess();
  const [tab, setTab] = useState<"results" | "templates">("results");

  const results = useMemo(
    () => inspectionResults
      .filter((r) => facilityId === "all" || r.facilityId === facilityId)
      .sort((a, b) => new Date(b.inspectedAt).getTime() - new Date(a.inspectedAt).getTime()),
    [facilityId],
  );

  if (!can("inspections.view")) return <AccessRestricted />;

  const passes = results.filter((r) => r.result === "pass").length;
  const fails = results.filter((r) => r.result === "fail").length;
  const attention = results.filter((r) => r.result === "needs_attention").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspections"
        subtitle="Equipment & safety inspections with pass/fail results and photos."
        actions={can("inspections.manage") ? <button className="btn-primary"><ShieldCheck className="h-4 w-4" /> New inspection</button> : undefined}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Inspections logged" value={results.length} icon="ClipboardCheck" intent="brand" />
        <StatCard label="Passing" value={passes} icon="CheckCircle2" intent="success" />
        <StatCard label="Needs attention" value={attention} icon="AlertTriangle" intent="warning" />
        <StatCard label="Failed / out of service" value={fails} icon="XCircle" intent="danger" />
      </div>

      <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
        {(["results", "templates"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-all", tab === t ? "bg-white text-slate-900 shadow-card" : "text-slate-500")}>
            {t === "results" ? "Recent results" : "Inspection templates"}
          </button>
        ))}
      </div>

      {tab === "results" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => <ResultCard key={r.id} r={r} />)}
          {results.length === 0 && <p className="col-span-full py-10 text-center text-sm text-slate-400">No inspections for this facility.</p>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {inspectionTemplates.map((t) => (
            <SectionCard key={t.id} title={t.name} subtitle={`${INSPECTION_FEATURE_LABELS[t.feature]} · every ${t.cadenceDays} days`}>
              <ul className="space-y-1.5 text-sm text-slate-600">
                {t.checkpoints.map((c, i) => <li key={i} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" /> {c}</li>)}
              </ul>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCard({ r }: { r: InspectionResult }) {
  const template = inspectionTemplates.find((t) => t.id === r.templateId);
  const m = RESULT_META[r.result];
  const Icon = m.icon;
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><ShieldCheck className="h-4 w-4" /></span>
          <div>
            <p className="text-sm font-semibold text-slate-800">{template?.name ?? "Inspection"}</p>
            <p className="text-xs text-slate-400">{facilityName(r.facilityId)}</p>
          </div>
        </div>
        <Badge intent={m.intent}><Icon className="h-3 w-3" /> {m.label}</Badge>
      </div>
      {r.notes && <p className="mt-3 text-sm text-slate-600">{r.notes}</p>}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
        <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> {staffName(r.inspectedBy)} · {relativeTime(r.inspectedAt)}</span>
        {r.hasPhoto && <span className="flex items-center gap-1 text-brand-600"><Camera className="h-3.5 w-3.5" /> Photo</span>}
      </div>
    </div>
  );
}
