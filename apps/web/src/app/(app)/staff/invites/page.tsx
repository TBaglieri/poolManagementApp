"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPlus, Send, X, Users, Clock } from "lucide-react";
import { getRole, facilityName, formatDate, relativeTime } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useInvites, INVITE_STATUS_INTENT } from "@/lib/invites";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { Badge, RoleBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InviteStaffModal } from "@/components/staff/invite-staff-modal";

export default function StaffInvitesPage() {
  const { can } = useAccess();
  const invites = useInvites((s) => s.invites);
  const cancelInvite = useInvites((s) => s.cancelInvite);
  const resendInvite = useInvites((s) => s.resendInvite);
  const [open, setOpen] = useState(false);

  if (!can("staff.invite") && !can("staff.manage")) return <AccessRestricted message="Inviting staff is limited to admins and HR coordinators." />;

  const pending = invites.filter((i) => i.status === "sent" || i.status === "pending").length;
  const accepted = invites.filter((i) => i.status === "accepted").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Invitations"
        subtitle="Invite people by email, assign roles, and track who has accepted."
        actions={
          <>
            <Link href="/staff" className="btn-secondary"><Users className="h-4 w-4" /> Directory</Link>
            <Button icon="UserPlus" onClick={() => setOpen(true)}>Invite staff</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total invites" value={invites.length} icon="Mail" intent="brand" />
        <StatCard label="Pending" value={pending} icon="Clock" intent="warning" />
        <StatCard label="Accepted" value={accepted} icon="UserCheck" intent="success" />
        <StatCard label="Canceled" value={invites.filter((i) => i.status === "canceled").length} icon="UserX" intent="neutral" />
      </div>

      <SectionCard title="Invitations" subtitle={`${invites.length} total`}>
        {invites.length === 0 ? (
          <EmptyState icon="MailPlus" title="No invitations yet" description="Invite your first staff member by email — they'll get a link to accept and set up their account."
            action={<Button icon="UserPlus" onClick={() => setOpen(true)}>Invite staff</Button>} />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2">Invitee</th><th className="px-3 py-2">Role</th><th className="px-3 py-2 hidden md:table-cell">Facility</th><th className="px-3 py-2 hidden sm:table-cell">Sent</th><th className="px-3 py-2 text-center">Status</th><th className="px-3 py-2 text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {invites.map((i) => (
                  <tr key={i.id}>
                    <td className="px-3 py-2.5"><p className="font-medium text-slate-800">{i.firstName} {i.lastName}</p><p className="text-xs text-slate-400">{i.email}</p></td>
                    <td className="px-3 py-2.5"><RoleBadge role={i.role} /></td>
                    <td className="px-3 py-2.5 hidden md:table-cell text-slate-500">{facilityName(i.homeFacilityId)}</td>
                    <td className="px-3 py-2.5 hidden sm:table-cell text-slate-400">{relativeTime(i.createdAt)}</td>
                    <td className="px-3 py-2.5 text-center"><Badge intent={INVITE_STATUS_INTENT[i.status]}>{i.status}</Badge></td>
                    <td className="px-3 py-2.5 text-right">
                      {(i.status === "sent" || i.status === "pending") && (
                        <>
                          <button onClick={() => resendInvite(i.id)} className="mr-1 rounded-md p-1.5 text-brand-600 hover:bg-brand-50" title="Resend"><Send className="h-4 w-4" /></button>
                          <button onClick={() => cancelInvite(i.id)} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50" title="Cancel"><X className="h-4 w-4" /></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <InviteStaffModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
