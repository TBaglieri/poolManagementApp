"use client";

import { useMemo, useState } from "react";
import {
  staffCertifications, getStaff, staffName, facilityName,
  CERT_TYPE_LABELS, formatDate, daysUntil,
  type StaffCertification,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StaffAvatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { certStatusMeta } from "@/lib/status";

export default function CertificationsPage() {
  const { can } = useAccess();
  const [statusF, setStatusF] = useState("all");
  const [typeF, setTypeF] = useState("all");

  const rows = useMemo(() => staffCertifications.filter((c) => {
    if (statusF !== "all" && c.status !== statusF) return false;
    if (typeF !== "all" && c.type !== typeF) return false;
    return true;
  }).sort((a, b) => {
    const order = { expired: 0, expiring: 1, missing: 2, valid: 3 };
    return order[a.status] - order[b.status];
  }), [statusF, typeF]);

  const count = (s: StaffCertification["status"]) => staffCertifications.filter((c) => c.status === s).length;

  const columns: Column<StaffCertification>[] = [
    { key: "staff", header: "Staff", render: (c) => (
      <div className="flex items-center gap-3">
        <StaffAvatar name={staffName(c.staffId)} color={getStaff(c.staffId)?.avatarColor ?? "#0E7490"} size="sm" />
        <div><p className="font-medium text-slate-800">{staffName(c.staffId)}</p><p className="text-xs text-slate-400">{facilityName(getStaff(c.staffId)?.homeFacilityId)}</p></div>
      </div>
    ) },
    { key: "type", header: "Certification", render: (c) => <span className="text-slate-700">{CERT_TYPE_LABELS[c.type]}</span> },
    { key: "issued", header: "Issued", hideOnMobile: true, render: (c) => <span className="text-slate-500">{c.issuedDate ? formatDate(c.issuedDate) : "—"}</span> },
    { key: "expires", header: "Expires", render: (c) => {
      if (!c.expiresDate) return <span className="text-slate-400">—</span>;
      const d = daysUntil(c.expiresDate);
      return <span className={d < 0 ? "text-rose-600" : d < 30 ? "text-amber-600" : "text-slate-600"}>{formatDate(c.expiresDate)}{d < 30 && ` (${d < 0 ? `${Math.abs(d)}d ago` : `${d}d`})`}</span>;
    } },
    { key: "status", header: "Status", render: (c) => <StatusBadge {...certStatusMeta(c.status)} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Certifications" subtitle="Track lifeguard, CPR/AED, WSI, and operator certifications."
        actions={can("certifications.manage") && <Button icon="Upload">Upload certificate</Button>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Valid" value={count("valid")} icon="BadgeCheck" intent="success" />
        <StatCard label="Expiring soon" value={count("expiring")} icon="Clock" intent="warning" />
        <StatCard label="Expired" value={count("expired")} icon="BadgeX" intent="danger" />
        <StatCard label="Missing" value={count("missing")} icon="CircleHelp" intent="neutral" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          <p className="mr-auto text-sm font-medium text-slate-500">{rows.length} records</p>
          <Select value={typeF} onChange={(e) => setTypeF(e.target.value)} className="w-auto">
            <option value="all">All types</option>
            {Object.entries(CERT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="w-auto">
            <option value="all">All statuses</option>
            <option value="valid">Valid</option>
            <option value="expiring">Expiring soon</option>
            <option value="expired">Expired</option>
            <option value="missing">Missing</option>
          </Select>
        </div>
        <DataTable columns={columns} rows={rows} getKey={(c) => c.id} empty={{ title: "No certifications match", icon: "BadgeCheck" }} />
      </div>
    </div>
  );
}
