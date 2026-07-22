"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, DollarSign, AlertTriangle, Lock } from "lucide-react";
import {
  payPeriods, payrollReviews, payrollExports, getStaff, staffName, facilityName,
  formatHours, formatCurrency, formatDate, PAYROLL_STATUS_LABELS,
  type PayrollReview,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useTenantSeed } from "@/lib/tenant-data";
import { downloadCSV } from "@/lib/csv";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { StaffAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { payrollStatusMeta } from "@/lib/status";

export default function PayrollPage() {
  const { can } = useAccess();
  // Pay periods, reviews and exports are demo operational data — empty for real tenants.
  const { demo } = useTenantSeed();
  const periods = demo ? payPeriods : [];
  const exports = demo ? payrollExports : [];
  const [periodId, setPeriodId] = useState(demo ? payPeriods[0]?.id ?? "" : "");
  const [reviews, setReviews] = useState<PayrollReview[]>(demo ? payrollReviews : []);

  if (!can("payroll.view")) {
    return <AccessRestricted message="Payroll is restricted to the payroll/payment team and admins. Lifeguards and operations staff can't access this page." />;
  }

  const rateFor = (staffId: string) => getStaff(staffId)?.payRate ?? 17;
  const grossFor = (r: PayrollReview) => r.regularHours * rateFor(r.staffId) + r.overtimeHours * rateFor(r.staffId) * 1.5;

  const totalRegular = reviews.reduce((s, r) => s + r.regularHours, 0);
  const totalOt = reviews.reduce((s, r) => s + r.overtimeHours, 0);
  const estCost = reviews.reduce((s, r) => s + grossFor(r), 0);
  const needsReview = reviews.filter((r) => r.status === "needs_review").length;
  const readyToApprove = reviews.filter((r) => r.status === "ready" || r.status === "needs_review").length;

  const approveAllReady = () =>
    setReviews((rs) => rs.map((r) => (r.status === "ready" || r.status === "needs_review" ? { ...r, status: "approved" } : r)));

  const exportPayroll = () => {
    const rows = reviews.map((r) => ({
      staff: staffName(r.staffId),
      facility: facilityName(getStaff(r.staffId)?.homeFacilityId),
      regularHours: r.regularHours,
      overtimeHours: r.overtimeHours,
      rate: rateFor(r.staffId),
      estGross: grossFor(r).toFixed(2),
      status: PAYROLL_STATUS_LABELS[r.status],
    }));
    const label = periods.find((p) => p.id === periodId)?.label ?? "period";
    downloadCSV(`payroll-${label.replace(/\s+/g, "-")}`, rows, [
      { key: "staff", label: "Staff" },
      { key: "facility", label: "Facility" },
      { key: "regularHours", label: "Regular hours" },
      { key: "overtimeHours", label: "Overtime hours" },
      { key: "rate", label: "Pay rate" },
      { key: "estGross", label: "Est. gross" },
      { key: "status", label: "Status" },
    ]);
  };

  const columns: Column<PayrollReview>[] = [
    { key: "staff", header: "Staff", render: (r) => (
      <div className="flex items-center gap-3">
        <StaffAvatar name={staffName(r.staffId)} color={getStaff(r.staffId)?.avatarColor ?? "#0E7490"} size="sm" />
        <div><p className="font-medium text-slate-800">{staffName(r.staffId)}</p><p className="text-xs text-slate-400">{facilityName(getStaff(r.staffId)?.homeFacilityId)}</p></div>
      </div>
    ) },
    { key: "regular", header: "Regular", align: "right", render: (r) => <span className="font-medium text-slate-700">{formatHours(r.regularHours)}</span> },
    { key: "ot", header: "Overtime", align: "right", render: (r) => <span className={r.overtimeHours > 0 ? "font-semibold text-amber-600" : "text-slate-400"}>{r.overtimeHours > 0 ? formatHours(r.overtimeHours) : "—"}</span> },
    { key: "gross", header: "Est. gross", align: "right", hideOnMobile: true, render: (r) => {
      const rate = getStaff(r.staffId)?.payRate ?? 17;
      return <span className="text-slate-600">{formatCurrency(r.regularHours * rate + r.overtimeHours * rate * 1.5)}</span>;
    } },
    { key: "flags", header: "Flags", hideOnMobile: true, render: (r) => r.hasMissingPunch ? <Badge intent="danger"><AlertTriangle className="h-3 w-3" /> Missing punch</Badge> : r.overtimeHours > 0 ? <Badge intent="warning">OT</Badge> : <span className="text-slate-300">—</span> },
    { key: "status", header: "Status", render: (r) => <Badge intent={payrollStatusMeta(r.status).intent}>{PAYROLL_STATUS_LABELS[r.status]}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll" subtitle="Timesheet review, approvals, and payroll exports."
        actions={
          <div className="flex items-center gap-2">
            <Select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className="w-auto">
              {periods.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
            {can("payroll.export") && <Button icon="Download" onClick={exportPayroll}>Export payroll</Button>}
          </div>
        } />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Regular hours" value={formatHours(totalRegular)} icon="Clock" intent="brand" />
        <StatCard label="Overtime hours" value={formatHours(totalOt)} icon="AlarmClock" intent="warning" />
        <StatCard label="Est. gross" value={formatCurrency(estCost)} icon="DollarSign" intent="success" hint="This period" />
        <StatCard label="Needs review" value={needsReview} icon="AlertTriangle" intent={needsReview > 0 ? "danger" : "success"} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <Lock className="mr-1.5 inline h-4 w-4 text-slate-400" />
        Payroll figures are placeholders. Real payroll requires verified time records, approved timesheets, and an integration with your payroll provider (ADP, Gusto, Paychex). No real payments are processed.
      </div>

      <SectionCard title="Timesheet review" subtitle={`Pay period ${periods.find((p) => p.id === periodId)?.label}`}
        actions={can("payroll.manage") && <Button variant="secondary" size="sm" icon="Check" onClick={approveAllReady} disabled={readyToApprove === 0}>Approve all ready ({readyToApprove})</Button>}>
        <DataTable columns={columns} rows={reviews} getKey={(r) => r.id}
          empty={{ title: "No timesheets yet", description: "Timesheets appear once staff clock in and out.", icon: "Clock" }} />
      </SectionCard>

      <SectionCard title="Recent exports" subtitle="Payroll export history" icon={<FileSpreadsheet className="h-4 w-4 text-slate-400" />}>
        <ul className="divide-y divide-slate-100">
          {exports.map((e) => (
            <li key={e.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">{periods.find((p) => p.id === e.payPeriodId)?.label} · {e.format.toUpperCase()}</p>
                <p className="text-xs text-slate-400">{e.rowCount} staff · by {staffName(e.createdBy)} · {formatDate(e.createdAt)}</p>
              </div>
              <Badge intent="neutral">Exported</Badge>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
