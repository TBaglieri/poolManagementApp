"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BellRing } from "lucide-react";
import {
  staffCertifications, staff as allStaff, getStaff, staffName, facilityName,
  CERT_TYPE_LABELS, formatDate, daysUntil, uid,
  type StaffCertification, type CertificationType,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StaffAvatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/field";
import { certStatusMeta } from "@/lib/status";

/** Derive a status from an expiry date: <0d expired, <30d expiring, else valid. */
function statusFromExpiry(expiresDate: string | undefined): StaffCertification["status"] {
  if (!expiresDate) return "missing";
  const d = daysUntil(expiresDate);
  return d < 0 ? "expired" : d < 30 ? "expiring" : "valid";
}

export default function CertificationsPage() {
  const { can } = useAccess();
  const [statusF, setStatusF] = useState("all");
  const [typeF, setTypeF] = useState("all");
  const [certs, setCerts] = useState<StaffCertification[]>(staffCertifications);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    staffId: allStaff[0]?.id ?? "", type: "lifeguard" as CertificationType,
    issuedDate: new Date().toISOString().slice(0, 10), expiresDate: "",
  });

  const rows = useMemo(() => certs.filter((c) => {
    if (statusF !== "all" && c.status !== statusF) return false;
    if (typeF !== "all" && c.type !== typeF) return false;
    return true;
  }).sort((a, b) => {
    const order = { expired: 0, expiring: 1, missing: 2, valid: 3 };
    return order[a.status] - order[b.status];
  }), [statusF, typeF, certs]);

  const count = (s: StaffCertification["status"]) => certs.filter((c) => c.status === s).length;

  // Expiry reminders: expired first, then expiring (within 30 days), by urgency.
  const reminders = useMemo(() => certs
    .filter((c) => (c.status === "expired" || c.status === "expiring") && c.expiresDate)
    .sort((a, b) => daysUntil(a.expiresDate!) - daysUntil(b.expiresDate!)), [certs]);

  const remindAll = () => setRemindedIds(new Set(reminders.map((r) => r.id)));

  const saveCert = () => {
    if (!form.staffId || !form.expiresDate) return;
    const status = statusFromExpiry(form.expiresDate);
    setCerts((prev) => {
      const existing = prev.find((c) => c.staffId === form.staffId && c.type === form.type);
      if (existing) {
        return prev.map((c) => (c.id === existing.id ? { ...c, issuedDate: form.issuedDate, expiresDate: form.expiresDate, status } : c));
      }
      return [{ id: uid("cert"), staffId: form.staffId, type: form.type, issuedDate: form.issuedDate, expiresDate: form.expiresDate, status } as StaffCertification, ...prev];
    });
    setModalOpen(false);
  };

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
        actions={can("certifications.manage") && <Button icon="Upload" onClick={() => setModalOpen(true)}>Record / renew</Button>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Valid" value={count("valid")} icon="BadgeCheck" intent="success" />
        <StatCard label="Expiring soon" value={count("expiring")} icon="Clock" intent="warning" />
        <StatCard label="Expired" value={count("expired")} icon="BadgeX" intent="danger" />
        <StatCard label="Missing" value={count("missing")} icon="CircleHelp" intent="neutral" />
      </div>

      {reminders.length > 0 && (
        <SectionCard
          title="Renewal reminders"
          subtitle={`${reminders.length} certification${reminders.length > 1 ? "s" : ""} expired or expiring within 30 days`}
          actions={can("certifications.manage") && (
            <Button variant="secondary" size="sm" icon="BellRing" onClick={remindAll} disabled={reminders.every((r) => remindedIds.has(r.id))}>
              Remind all
            </Button>
          )}>
          <ul className="divide-y divide-slate-100">
            {reminders.map((c) => {
              const d = daysUntil(c.expiresDate!);
              const expired = d < 0;
              return (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <AlertTriangle className={`h-4 w-4 ${expired ? "text-rose-500" : "text-amber-500"}`} />
                  <StaffAvatar name={staffName(c.staffId)} color={getStaff(c.staffId)?.avatarColor ?? "#0E7490"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{staffName(c.staffId)}</p>
                    <p className="truncate text-xs text-slate-500">{CERT_TYPE_LABELS[c.type]} · {expired ? `expired ${Math.abs(d)}d ago` : `expires in ${d}d`} ({formatDate(c.expiresDate!)})</p>
                  </div>
                  {remindedIds.has(c.id)
                    ? <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><BellRing className="h-3.5 w-3.5" /> Reminded</span>
                    : can("certifications.manage") && <Button variant="ghost" size="sm" onClick={() => setRemindedIds((prev) => new Set(prev).add(c.id))}>Remind</Button>}
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record / renew certification" size="md"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={saveCert} icon="Save" disabled={!form.staffId || !form.expiresDate}>Save</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Staff">
              <Select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
                {allStaff.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </Select>
            </Field>
            <Field label="Certification">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CertificationType })}>
                {Object.entries(CERT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Issued date"><Input type="date" value={form.issuedDate} onChange={(e) => setForm({ ...form, issuedDate: e.target.value })} /></Field>
            <Field label="Expires date"><Input type="date" value={form.expiresDate} min={form.issuedDate} onChange={(e) => setForm({ ...form, expiresDate: e.target.value })} /></Field>
          </div>
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
            Certificate file upload is a placeholder — wire Supabase Storage to attach the PDF/photo.
          </div>
          <p className="text-xs text-slate-400">Status is set automatically from the expiry date (expired · expiring within 30 days · valid).</p>
        </div>
      </Modal>
    </div>
  );
}
