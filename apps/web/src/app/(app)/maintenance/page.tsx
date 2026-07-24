"use client";

import { useState } from "react";
import { Wrench, ImageIcon, Calendar, MapPin } from "lucide-react";
import {
  getStaff, staffName, facilityName, formatShortDate,
  ISSUE_STATUS_LABELS, type IssueStatus, type MaintenanceIssue, type IssuePriority,
} from "@poolops/shared";
import { useAccess, useMyStaffId } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { useTenantSeed } from "@/lib/tenant-data";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StaffAvatar } from "@/components/ui/avatar";
import { priorityMeta } from "@/lib/status";
import { cn } from "@/lib/cn";

const COLUMNS: IssueStatus[] = ["new", "in_progress", "waiting_parts", "resolved"];
const COL_ACCENT: Record<IssueStatus, string> = {
  new: "border-t-sky-400", in_progress: "border-t-brand-500", waiting_parts: "border-t-amber-400", resolved: "border-t-emerald-500",
};
export default function MaintenancePage() {
  const { can, staff: me, facilityId } = useAccess();
  const myStaffId = useMyStaffId();
  const { facilities, staff } = useTenantSeed();
  // Assignable maintenance staff come from THIS tenant's roster (empty for a fresh
  // real tenant — never demo staff).
  const maintStaff = staff.filter((s) => s.primaryRole === "maintenance" || s.roles.includes("maintenance"));
  const issues = useDemo((s) => s.issues);
  const addIssue = useDemo((s) => s.addIssue);
  const setStatus = useDemo((s) => s.setIssueStatus);
  const assign = useDemo((s) => s.assignIssue);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ facilityId: facilities[0]?.id ?? "", area: "", title: "", description: "", priority: "medium" as IssuePriority });

  const facMatch = (fid: string) => facilityId === "all" || fid === facilityId;
  const visible = issues.filter((i) => facMatch(i.facilityId));
  const canManage = can("maintenance.manage");

  const submit = () => {
    if (!form.title.trim()) return;
    addIssue({
      facilityId: form.facilityId, area: form.area || "General", title: form.title, description: form.description,
      priority: form.priority, status: "new", reportedBy: myStaffId ?? me?.id ?? "unknown", assignedTo: null, hasPhoto: false,
    });
    setOpen(false);
    setForm({ facilityId: facilities[0]?.id ?? "", area: "", title: "", description: "", priority: "medium" });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Maintenance" subtitle="Report, assign, and resolve facility issues."
        actions={can("maintenance.report") && <Button icon="Plus" onClick={() => setOpen(true)}>Report issue</Button>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {COLUMNS.map((st) => (
          <StatCard key={st} label={ISSUE_STATUS_LABELS[st]} value={visible.filter((i) => i.status === st).length}
            icon={st === "resolved" ? "CheckCircle2" : st === "waiting_parts" ? "Package" : "Wrench"}
            intent={st === "resolved" ? "success" : st === "waiting_parts" ? "warning" : st === "in_progress" ? "brand" : "info"} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const colIssues = visible.filter((i) => i.status === col);
          return (
            <div key={col} className={cn("rounded-2xl border border-t-4 border-slate-200 bg-slate-50/60", COL_ACCENT[col])}>
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm font-semibold text-slate-700">{ISSUE_STATUS_LABELS[col]}</span>
                <span className="chip bg-white text-slate-500">{colIssues.length}</span>
              </div>
              <div className="space-y-2.5 px-2.5 pb-3">
                {colIssues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} canManage={canManage} assignable={maintStaff}
                    onStatus={(s) => setStatus(issue.id, s)} onAssign={(sid) => assign(issue.id, sid)} />
                ))}
                {colIssues.length === 0 && <p className="py-6 text-center text-xs text-slate-300">No issues</p>}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Report maintenance issue"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit} icon="Wrench">Submit</Button></>}>
        <div className="space-y-4">
          <Field label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Cracked skimmer basket" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Facility"><Select value={form.facilityId} onChange={(e) => setForm({ ...form, facilityId: e.target.value })}>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
            <Field label="Area"><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Pump room, deck…" /></Field>
          </div>
          <Field label="Priority"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as IssuePriority })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></Select></Field>
          <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's wrong?" /></Field>
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
            <ImageIcon className="mx-auto h-6 w-6" /><p className="mt-1">Photo upload placeholder</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function IssueCard({ issue, canManage, assignable, onStatus, onAssign }: {
  issue: MaintenanceIssue; canManage: boolean; assignable: { id: string; firstName: string; lastName: string }[];
  onStatus: (s: IssueStatus) => void; onAssign: (sid: string) => void;
}) {
  const assignee = getStaff(issue.assignedTo);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{issue.title}</p>
        <StatusBadge {...priorityMeta(issue.priority)} dot={false} />
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{issue.description}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {facilityName(issue.facilityId)} · {issue.area}</span>
        {issue.dueDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatShortDate(issue.dueDate)}</span>}
        {issue.hasPhoto && <ImageIcon className="h-3 w-3" />}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          {assignee ? <><StaffAvatar name={staffName(issue.assignedTo)} color={assignee.avatarColor} size="xs" /> {assignee.firstName}</> : <span className="text-slate-400">Unassigned</span>}
        </span>
        {canManage && (
          <Select value={issue.status} onChange={(e) => onStatus(e.target.value as IssueStatus)} className="w-auto !py-1 !text-xs">
            {COLUMNS.map((s) => <option key={s} value={s}>{ISSUE_STATUS_LABELS[s]}</option>)}
          </Select>
        )}
      </div>
      {canManage && !issue.assignedTo && (
        <Select onChange={(e) => e.target.value && onAssign(e.target.value)} className="mt-2 w-full !py-1 !text-xs" defaultValue="">
          <option value="" disabled>Assign to…</option>
          {assignable.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
        </Select>
      )}
    </div>
  );
}
