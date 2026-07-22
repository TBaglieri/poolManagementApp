"use client";

import { useMemo, useState } from "react";
import { UserPlus, Upload, MailCheck, RotateCcw, Ban, Send, X, ShieldCheck } from "lucide-react";
import { staff as seedStaff, getRole, facilityName, staffName, type RoleSlug } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useInvites, INVITE_STATUS_INTENT, MGMT_PERMISSION_LABELS } from "@/lib/invites";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { StaffAvatar } from "@/components/ui/avatar";
import { Badge, RoleBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InviteStaffModal } from "@/components/staff/invite-staff-modal";

export default function UsersPage() {
  const { can, roleMeta } = useAccess();
  const invites = useInvites((s) => s.invites);
  const cancelInvite = useInvites((s) => s.cancelInvite);
  const resendInvite = useInvites((s) => s.resendInvite);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deactivated, setDeactivated] = useState<Record<string, boolean>>({});
  const [csvOpen, setCsvOpen] = useState(false);

  const canManage = can("staff.invite") || can("staff.manage");
  const users = useMemo(() => seedStaff.filter((s) => s.primaryRole !== "auditor" || true), []);
  const pending = invites.filter((i) => i.status === "sent" || i.status === "pending");

  if (!canManage) return <AccessRestricted message="User management is limited to admins and HR/onboarding coordinators." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Access"
        subtitle="Create accounts by email, assign roles, and delegate management. Signed in as a manager who can invite within their level."
        actions={
          <>
            <Button variant="secondary" icon="Upload" onClick={() => setCsvOpen((v) => !v)}>Import CSV</Button>
            <Button icon="UserPlus" onClick={() => setInviteOpen(true)}>Invite user</Button>
          </>
        }
      />

      {csvOpen && (
        <SectionCard title="Bulk import (placeholder)">
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center">
            <Upload className="mx-auto h-7 w-7 text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-700">Drop a CSV of name, email, role, facility</p>
            <p className="mt-1 text-xs text-slate-400">Rows are previewed, roles validated, and pending invites created. (Parser is a placeholder in this demo.)</p>
            <Button variant="secondary" className="mt-3">Choose file</Button>
          </div>
        </SectionCard>
      )}

      {/* Pending invites */}
      <SectionCard title="Pending invitations" subtitle={`${pending.length} awaiting acceptance`}>
        {pending.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No pending invites. Click “Invite user” to create one.</p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2">Invitee</th><th className="px-3 py-2">Role</th><th className="px-3 py-2 hidden md:table-cell">Facility</th><th className="px-3 py-2 text-center">Status</th><th className="px-3 py-2 text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {pending.map((i) => (
                  <tr key={i.id}>
                    <td className="px-3 py-2.5"><p className="font-medium text-slate-800">{i.firstName} {i.lastName}</p><p className="text-xs text-slate-400">{i.email}</p></td>
                    <td className="px-3 py-2.5"><RoleBadge role={i.role} /></td>
                    <td className="px-3 py-2.5 hidden md:table-cell text-slate-500">{facilityName(i.homeFacilityId)}</td>
                    <td className="px-3 py-2.5 text-center"><Badge intent={INVITE_STATUS_INTENT[i.status]}>{i.status}</Badge></td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => resendInvite(i.id)} className="mr-1 rounded-md p-1.5 text-brand-600 hover:bg-brand-50" title="Resend"><Send className="h-4 w-4" /></button>
                      <button onClick={() => cancelInvite(i.id)} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50" title="Cancel"><X className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Org users */}
      <SectionCard title="Organization users" subtitle={`${users.length} members`}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2">User</th><th className="px-3 py-2">Role</th><th className="px-3 py-2 hidden lg:table-cell">Management</th><th className="px-3 py-2 text-center">Status</th><th className="px-3 py-2 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const off = deactivated[u.id];
                const isManager = ["org_admin", "ops_manager", "lifeguard_manager", "scheduling_manager", "hr_coordinator"].includes(u.primaryRole);
                return (
                  <tr key={u.id} className={off ? "opacity-50" : ""}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <StaffAvatar name={staffName(u.id)} color={u.avatarColor} size="sm" />
                        <div><p className="font-medium text-slate-800">{u.firstName} {u.lastName}</p><p className="text-xs text-slate-400">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><RoleBadge role={u.primaryRole} /></td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      {isManager ? <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700"><ShieldCheck className="h-3.5 w-3.5" /> Can manage team</span> : <span className="text-xs text-slate-400">Staff</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center"><StatusBadge label={off ? "Deactivated" : "Active"} intent={off ? "neutral" : "success"} /></td>
                    <td className="px-3 py-2.5 text-right">
                      {off ? (
                        <button onClick={() => setDeactivated((d) => ({ ...d, [u.id]: false }))} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50"><RotateCcw className="h-3.5 w-3.5" /> Reactivate</button>
                      ) : (
                        <button onClick={() => setDeactivated((d) => ({ ...d, [u.id]: true }))} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-500 hover:bg-rose-50"><Ban className="h-3.5 w-3.5" /> Deactivate</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><MailCheck className="h-3.5 w-3.5" /> Deactivating a user removes their access but keeps historical records (shifts, logs, payroll).</p>
      </SectionCard>

      <InviteStaffModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
