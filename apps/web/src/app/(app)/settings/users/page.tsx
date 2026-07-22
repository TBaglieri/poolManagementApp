"use client";

import { useMemo, useState } from "react";
import { UserPlus, Users, MailCheck, RotateCcw, Ban, Send, X, Copy, Check, KeyRound } from "lucide-react";
import { staff as seedStaff, facilities as seedFacilities, staffName, resolveRoleShortLabel, activeRoleList, type RoleSlug } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useTenantConfig } from "@/lib/tenant/provider";
import { useInvites, INVITE_STATUS_INTENT } from "@/lib/invites";
import { parseBulkEmails } from "@/lib/accounts";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { StaffAvatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Textarea, Select } from "@/components/ui/field";
import { InviteStaffModal } from "@/components/staff/invite-staff-modal";

function inviteLink(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/accept-invite/${token}`;
}

export default function UsersPage() {
  const { can, staffId } = useAccess();
  const config = useTenantConfig();
  const invites = useInvites((s) => s.invites);
  const createInvite = useInvites((s) => s.createInvite);
  const cancelInvite = useInvites((s) => s.cancelInvite);
  const resendInvite = useInvites((s) => s.resendInvite);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkRole, setBulkRole] = useState<RoleSlug>("lifeguard");
  const [bulkResult, setBulkResult] = useState<{ created: number; invalid: string[] } | null>(null);
  const [deactivated, setDeactivated] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState<Record<string, boolean>>({});

  const canManage = can("staff.invite") || can("staff.manage");
  const roles = activeRoleList(config);
  const homeFacilityId = seedFacilities[0]?.id ?? "";
  const users = useMemo(() => seedStaff, []);
  const pending = invites.filter((i) => i.status === "sent" || i.status === "pending");

  if (!canManage) return <AccessRestricted message="User management is limited to admins and managers." />;

  const runBulk = () => {
    const { emails, invalid } = parseBulkEmails(bulkEmails);
    const existing = new Set([
      ...invites.map((i) => i.email.toLowerCase()),
      ...seedStaff.map((s) => s.email.toLowerCase()),
    ]);
    let created = 0;
    for (const email of emails) {
      if (existing.has(email)) continue;
      createInvite({ email, firstName: "", lastName: "", role: bulkRole, homeFacilityId }, staffId ?? "system");
      created++;
    }
    setBulkResult({ created, invalid });
    setBulkEmails("");
  };

  const copy = (token: string) => {
    navigator.clipboard?.writeText(inviteLink(token)).then(() => {
      setCopied(token);
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 1500);
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Access"
        subtitle="Provision admins and onboard lifeguards by email. Each person gets their own login — everything they do is recorded under their name."
        actions={
          <>
            <Button variant="secondary" icon="Users" onClick={() => { setBulkOpen((v) => !v); setBulkResult(null); }}>Add lifeguards</Button>
            <Button icon="UserPlus" onClick={() => setInviteOpen(true)}>Invite user</Button>
          </>
        }
      />

      {/* Bulk onboarding — invite ~10 guards at once at the start of the season. */}
      {bulkOpen && (
        <SectionCard title="Onboard lifeguards" subtitle="Paste emails (one per line or comma-separated). Each guard gets an individual invite to set their own password.">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Field label="Guard emails">
              <Textarea rows={5} value={bulkEmails} onChange={(e) => setBulkEmails(e.target.value)} placeholder={"aisha@example.com\ntyler@example.com\nsofia@example.com"} />
            </Field>
            <div className="flex flex-col gap-3">
              <Field label="Role">
                <Select value={bulkRole} onChange={(e) => setBulkRole(e.target.value as RoleSlug)}>
                  {roles.map((r) => <option key={r.slug} value={r.slug}>{resolveRoleShortLabel(config, r.slug)}</option>)}
                </Select>
              </Field>
              <Button icon="Send" onClick={runBulk} className="mt-auto">Create invites</Button>
            </div>
          </div>
          {bulkResult && (
            <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Created {bulkResult.created} invite{bulkResult.created === 1 ? "" : "s"}.
              {bulkResult.invalid.length > 0 && <span className="text-rose-600"> Skipped invalid: {bulkResult.invalid.join(", ")}.</span>}
              <span className="text-emerald-600"> Share each link from the list below (or wire email to auto-send).</span>
            </div>
          )}
        </SectionCard>
      )}

      {/* Pending invites + lifecycle (resend / revoke / copy link) */}
      <SectionCard title="Pending invitations" subtitle={`${pending.length} awaiting acceptance`}>
        {pending.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No pending invites. Use “Add lifeguards” or “Invite user”.</p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2">Invitee</th><th className="px-3 py-2">Role</th><th className="px-3 py-2 text-center">Status</th><th className="px-3 py-2 text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pending.map((i) => (
                  <tr key={i.id}>
                    <td className="px-3 py-2.5"><p className="font-medium text-slate-800 dark:text-slate-200">{i.firstName || i.lastName ? `${i.firstName} ${i.lastName}` : i.email}</p><p className="text-xs text-slate-400">{i.email}</p></td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{resolveRoleShortLabel(config, i.role)}</td>
                    <td className="px-3 py-2.5 text-center"><Badge intent={INVITE_STATUS_INTENT[i.status]}>{i.status}</Badge></td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => copy(i.token)} className="mr-1 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Copy invite link">
                        {copied === i.token ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                      <button onClick={() => resendInvite(i.id)} className="mr-1 rounded-md p-1.5 text-brand-600 hover:bg-brand-50" title="Resend"><Send className="h-4 w-4" /></button>
                      <button onClick={() => cancelInvite(i.id)} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50" title="Revoke"><X className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Org users — deactivate / reactivate / reset password */}
      <SectionCard title="People" subtitle={`${users.length} members`}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2">User</th><th className="px-3 py-2">Role</th><th className="px-3 py-2 text-center">Status</th><th className="px-3 py-2 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => {
                const off = deactivated[u.id];
                return (
                  <tr key={u.id} className={off ? "opacity-50" : ""}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <StaffAvatar name={staffName(u.id)} color={u.avatarColor} size="sm" />
                        <div><p className="font-medium text-slate-800 dark:text-slate-200">{u.firstName} {u.lastName}</p><p className="text-xs text-slate-400">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{resolveRoleShortLabel(config, u.primaryRole)}</td>
                    <td className="px-3 py-2.5 text-center"><StatusBadge label={off ? "Deactivated" : "Active"} intent={off ? "neutral" : "success"} /></td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {resetSent[u.id] ? (
                        <span className="mr-2 text-xs text-emerald-600">Reset link sent</span>
                      ) : (
                        <button onClick={() => setResetSent((r) => ({ ...r, [u.id]: true }))} className="mr-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Send password reset"><KeyRound className="h-3.5 w-3.5" /> Reset</button>
                      )}
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
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><MailCheck className="h-3.5 w-3.5" /> Deactivating ends a person's access immediately but keeps their history (shifts, chemical logs, reports) intact and still attributed to them.</p>
      </SectionCard>

      <InviteStaffModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
