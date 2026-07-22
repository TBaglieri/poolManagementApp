"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Mail, Phone, Cake, Calendar, Shield } from "lucide-react";
import {
  facilityName, certificationsForStaff,
  EMPLOYMENT_STATUS_LABELS, CERT_TYPE_LABELS, formatDate, formatCurrency,
  type StaffProfile, type RoleSlug,
} from "@poolops/shared";
import { ROLE_LIST, getRole } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useTenantSeed } from "@/lib/tenant-data";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StaffAvatar } from "@/components/ui/avatar";
import { Badge, RoleBadge, StatusBadge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { Drawer, Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { InviteStaffModal } from "@/components/staff/invite-staff-modal";
import { staffFlagMeta, certStatusMeta } from "@/lib/status";

export default function StaffPage() {
  const { can } = useAccess();
  const { staff, facilities } = useTenantSeed();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>("all");
  const [facility, setFacility] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [selected, setSelected] = useState<StaffProfile | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const filtered = useMemo(() => staff.filter((s) => {
    if (search && !`${s.firstName} ${s.lastName} ${s.email} ${s.title}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (role !== "all" && s.primaryRole !== role) return false;
    if (facility !== "all" && !s.facilityIds.includes(facility)) return false;
    if (status !== "all" && !s.statusFlags.includes(status as StaffProfile["statusFlags"][number])) return false;
    return true;
  }), [search, role, facility, status]);

  const canPay = can("payroll.view");

  const columns: Column<StaffProfile>[] = [
    {
      key: "name", header: "Staff", render: (s) => (
        <div className="flex items-center gap-3">
          <StaffAvatar name={`${s.firstName} ${s.lastName}`} color={s.avatarColor} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800">{s.firstName} {s.lastName}{s.isMinor && <span className="ml-1.5 chip bg-amber-50 text-amber-700">Minor</span>}</p>
            <p className="truncate text-xs text-slate-400">{s.title}</p>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", render: (s) => <RoleBadge role={s.primaryRole} /> },
    { key: "facility", header: "Home pool", hideOnMobile: true, render: (s) => <span className="text-slate-600">{facilityName(s.homeFacilityId)}</span> },
    { key: "status", header: "Status", render: (s) => (
      <div className="flex flex-wrap gap-1">
        {s.statusFlags.slice(0, 2).map((f) => <StatusBadge key={f} {...staffFlagMeta(f)} dot={false} />)}
      </div>
    ) },
    { key: "onboarding", header: "Onboarding", hideOnMobile: true, render: (s) => <div className="w-24"><ProgressBar value={s.onboardingComplete} size="sm" showLabel /></div> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Directory"
        subtitle={`${staff.length} team members across ${facilities.length} facilities.`}
        actions={can("staff.invite") && (
          <>
            <Link href="/staff/invites" className="btn-secondary"><Mail className="h-4 w-4" /> Invites</Link>
            <Button icon="UserPlus" onClick={() => setInviteOpen(true)}>Invite staff</Button>
          </>
        )}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total staff" value={staff.length} icon="Users" intent="brand" />
        <StatCard label="Active" value={staff.filter((s) => s.employmentStatus === "active").length} icon="UserCheck" intent="success" />
        <StatCard label="Pending onboarding" value={staff.filter((s) => s.statusFlags.includes("pending_onboarding")).length} icon="ClipboardList" intent="info" />
        <StatCard label="Missing forms" value={staff.filter((s) => s.statusFlags.includes("missing_forms")).length} icon="FileWarning" intent="warning" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff…" className="input pl-9" />
          </div>
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-auto">
            <option value="all">All roles</option>
            {ROLE_LIST.map((r) => <option key={r.slug} value={r.slug}>{r.shortName}</option>)}
          </Select>
          <Select value={facility} onChange={(e) => setFacility(e.target.value)} className="w-auto">
            <option value="all">All facilities</option>
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending_onboarding">Pending onboarding</option>
            <option value="missing_forms">Missing forms</option>
            <option value="certification_expiring">Cert expiring</option>
            <option value="needs_review">Needs review</option>
          </Select>
        </div>
        <DataTable columns={columns} rows={filtered} getKey={(s) => s.id} onRowClick={setSelected}
          empty={staff.length === 0
            ? { title: "No staff onboarded yet", description: "Invite your team from Users & Access.", icon: "Users" }
            : { title: "No staff match your filters", icon: "Users" }} />
      </div>

      {/* Profile drawer */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.firstName} ${selected.lastName}` : ""} width="max-w-lg">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <StaffAvatar name={`${selected.firstName} ${selected.lastName}`} color={selected.avatarColor} size="xl" />
              <div>
                <div className="flex items-center gap-2"><RoleBadge role={selected.primaryRole} />{selected.isMinor && <Badge intent="warning">Under 18</Badge>}</div>
                <p className="mt-1 text-sm text-slate-500">{selected.title}</p>
                <p className="text-xs text-slate-400">{EMPLOYMENT_STATUS_LABELS[selected.employmentStatus]}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {selected.statusFlags.map((f) => <StatusBadge key={f} {...staffFlagMeta(f)} />)}
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <Row icon={Mail} value={selected.email} />
              <Row icon={Phone} value={selected.phone} />
              <Row icon={Cake} value={`Age ${selected.age}`} />
              <Row icon={Calendar} value={`Hired ${formatDate(selected.hireDate)}`} />
              <Row icon={Shield} value={`${facilityName(selected.homeFacilityId)}`} />
              <Row icon={Calendar} value={`Prefers ${selected.preferredHoursPerWeek} hrs/wk`} />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-semibold text-slate-700">Onboarding</p>
              <ProgressBar value={selected.onboardingComplete} showLabel />
              <p className="mt-1 text-xs text-slate-400">{selected.documentsSubmitted}/{selected.documentsRequired} documents submitted</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Certifications</p>
              <ul className="space-y-1.5">
                {certificationsForStaff(selected.id).map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <span className="text-slate-700">{CERT_TYPE_LABELS[c.type]}</span>
                    <StatusBadge {...certStatusMeta(c.status)} />
                  </li>
                ))}
                {certificationsForStaff(selected.id).length === 0 && <p className="text-sm text-slate-400">No certifications on file.</p>}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Emergency contact</p>
              <div className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <p className="font-medium text-slate-700">{selected.emergencyContact.name} <span className="text-slate-400">({selected.emergencyContact.relationship})</span></p>
                <p className="text-slate-500">{selected.emergencyContact.phone}</p>
              </div>
            </div>

            {canPay && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Payroll (restricted)</p>
                <p className="mt-1 text-sm text-slate-700">Pay rate: <span className="font-semibold">{formatCurrency(selected.payRate)}/hr</span></p>
                <p className="text-xs text-slate-400">Visible to payroll &amp; admin roles only.</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" icon="MessageSquare">Message</Button>
              {can("staff.manage") && <Button variant="secondary" className="flex-1" icon="Pencil">Edit</Button>}
            </div>
          </div>
        )}
      </Drawer>

      <InviteStaffModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

function Row({ icon: Icon, value }: { icon: typeof Mail; value: string }) {
  return <span className="flex items-center gap-2 text-slate-600"><Icon className="h-4 w-4 shrink-0 text-slate-400" /> <span className="truncate">{value}</span></span>;
}
