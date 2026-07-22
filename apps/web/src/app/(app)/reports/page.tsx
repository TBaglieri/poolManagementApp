"use client";

import { useMemo } from "react";
import {
  patronCounts, facilities, chemicalLogs, staffCertifications, maintenanceIssues,
  payrollReviews, shifts, facilityName, isoOffset, formatShortDate,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { TrendArea, SimpleBar, DonutChart } from "@/components/charts/charts";

const FAC_COLORS = ["#0891B2", "#0d9488", "#2563eb", "#0ea5e9"];

export default function ReportsPage() {
  const { can } = useAccess();

  const patronTrend = useMemo(() => {
    // Maplewood prior-week daily peaks for the trend chart.
    const hist = patronCounts.filter((p) => p.id.startsWith("pc_hist_"));
    return hist
      .map((p) => ({ day: formatShortDate(p.recordedAt), count: p.count }))
      .reverse();
  }, []);

  const facilityCoverage = useMemo(() =>
    facilities.map((f, i) => {
      const fShifts = shifts.filter((s) => s.facilityId === f.id);
      const filled = fShifts.filter((s) => s.assignedStaffId).length;
      return { facility: f.name.split(" ")[0], coverage: fShifts.length ? Math.round((filled / fShifts.length) * 100) : 0, color: FAC_COLORS[i % 4] };
    }), []);

  const certBreakdown = useMemo(() => {
    const by = { valid: 0, expiring: 0, expired: 0, missing: 0 };
    staffCertifications.forEach((c) => { by[c.status]++; });
    return [
      { name: "Valid", value: by.valid, color: "#10b981" },
      { name: "Expiring", value: by.expiring, color: "#f59e0b" },
      { name: "Expired", value: by.expired, color: "#ef4444" },
      { name: "Missing", value: by.missing, color: "#94a3b8" },
    ].filter((d) => d.value > 0);
  }, []);

  if (!can("reports.view")) return <AccessRestricted />;

  const totalHours = payrollReviews.reduce((s, r) => s + r.regularHours + r.overtimeHours, 0);
  const openIssues = maintenanceIssues.filter((i) => i.status !== "resolved").length;
  const outOfRange = chemicalLogs.filter((c) => c.outOfRange.length > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" subtitle="Cross-facility operations, compliance, and labor insights." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Scheduled hours" value={Math.round(totalHours)} icon="Clock" intent="brand" hint="Current pay period" />
        <StatCard label="Avg coverage" value={`${Math.round(facilityCoverage.reduce((s, f) => s + f.coverage, 0) / facilityCoverage.length)}%`} icon="ShieldCheck" intent="success" />
        <StatCard label="Open issues" value={openIssues} icon="Wrench" intent={openIssues > 3 ? "warning" : "info"} />
        <StatCard label="Chem readings flagged" value={outOfRange} icon="FlaskConical" intent={outOfRange > 0 ? "warning" : "success"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Patron attendance trend" subtitle="Maplewood · last 6 days">
          <TrendArea data={patronTrend} xKey="day" yKey="count" name="Peak patrons" height={240} />
        </SectionCard>
        <SectionCard title="Coverage by facility" subtitle="Filled vs total shifts">
          <SimpleBar data={facilityCoverage} xKey="facility" yKey="coverage" name="Coverage %" height={240} />
        </SectionCard>
        <SectionCard title="Certification compliance" subtitle="Across all staff">
          <div className="flex items-center gap-6">
            <div className="flex-1"><DonutChart data={certBreakdown} height={200} /></div>
            <ul className="space-y-2 text-sm">
              {certBreakdown.map((d) => (
                <li key={d.name} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-600">{d.name}</span>
                  <span className="ml-auto font-semibold text-slate-800">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </SectionCard>
        <SectionCard title="Facility snapshot" subtitle="Status across the network">
          <ul className="divide-y divide-slate-100">
            {facilities.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{f.name}</p>
                  <p className="text-xs text-slate-400">{f.operatingHours} · cap {f.capacity}</p>
                </div>
                <span className="chip bg-slate-100 capitalize text-slate-600">{f.status.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <p className="text-xs text-slate-400">Auditors and admins can export compliance reports (placeholder). Reports respect the current facility filter where applicable.</p>
    </div>
  );
}
