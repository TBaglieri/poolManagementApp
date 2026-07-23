"use client";

import { useMemo, useState } from "react";
import { UserPlus, Users, MailCheck, RotateCcw, Ban, Send, X, Copy, Check, KeyRound } from "lucide-react";
import { staff as seedStaff, facilities as seedFacilities, resolveRoleShortLabel, activeRoleList, type RoleSlug } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useTenantConfig } from "@/lib/tenant/provider";
import { useOrgMembers } from "@/lib/members";
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
import { cn } from "@/lib/cn";

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
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const [roleMsg, setRoleMsg] = useState<Record<string, string>>({});
  const [resetLink, setResetLink] = useState<Record<string, string>>({});

  // Admin-driven password reset — returns a copyable recovery link (reliable while
  // email/SMTP isn't configured). Server-enforced admin-only + tenant-scoped.
  const sendReset = async (id: string, email: string) => {
    setResetSent((r) => ({ ...r, [id]: true }));
    try {
      const res = await fetch("/api/admin/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const json = await res.json();
      if (json.ok && json.link) setResetLink((m) => ({ ...m, [id]: json.link }));
      else setRoleMsg((m) => ({ ...m, [id]: json.error || "Reset unavailable" }));
    } catch { setRoleMsg((m) => ({ ...m, [id]: "Network error" })); }
  };

  // Change a member's role (server-enforced: admin-only, tenant-scoped, last-admin
  // guarded, audited). The row's id is the member's profile id in supabase mode.
  const changeRole = async (profileId: string, role: string) => {
    setRowBusy((b) => ({ ...b, [profileId]: true })); setRoleMsg((m) => ({ ...m, [profileId]: "" }));
    try {
      const res = await fetch("/api/admin/set-role", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId, role }) });
      const json = await res.json();
      setRoleMsg((m) => ({ ...m, [profileId]: json.ok ? "Saved" : (json.error || "Failed") }));
      if (json.ok) reloadMembers();
    } catch { setRoleMsg((m) => ({ ...m, [profileId]: "Network error" })); }
    finally { setRowBusy((b) => ({ ...b, [profileId]: false })); }
  };

  const toggleActive = async (profileId: string, deactivate: boolean) => {
    setDeactivated((d) => ({ ...d, [profileId]: deactivate }));
    try {
      const res = await fetch("/api/admin/set-role", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId, deactivate }) });
      const json = await res.json().catch(() => ({ ok: false }));
      if (!json.ok) { setDeactivated((d) => ({ ...d, [profileId]: !deactivate })); setRoleMsg((m) => ({ ...m, [profileId]: json.error || "Failed" })); }
      else reloadMembers();
    } catch { setDeactivated((d) => ({ ...d, [profileId]: !deactivate })); }
  };

  const canManage = can("staff.invite") || can("staff.manage");
  const roles = activeRoleList(config);
  const homeFacilityId = seedFacilities[0]?.id ?? "";
  // Real tenant members from Supabase (or the seeded roster in demo/mock mode).
  const { members, live: membersLive, reload: reloadMembers } = useOrgMembers();
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

      {/* Org members — real people (Supabase); role change / deactivate / reset. */}
      <SectionCard title="People" subtitle={`${members.length} member${members.length === 1 ? "" : "s"}${membersLive ? "" : " · preview roster"}`}>
        {members.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No staff onboarded yet — invite your team above.</p>
        ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2">User</th><th className="px-3 py-2">Role</th><th className="px-3 py-2 text-center">Status</th><th className="px-3 py-2 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((u) => {
                const off = deactivated[u.profileId] ?? u.status !== "active";
                const name = `${u.firstName} ${u.lastName}`.trim() || u.email;
                return (
                  <tr key={u.profileId} className={off ? "opacity-50" : ""}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <StaffAvatar name={name} color={u.avatarColor ?? "#0E7490"} size="sm" />
                        <div><p className="font-medium text-slate-800 dark:text-slate-200">{name}</p><p className="text-xs text-slate-400">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {membersLive && canManage ? (
                        <>
                          <Select value={u.roleSlug} disabled={rowBusy[u.profileId]} onChange={(e) => changeRole(u.profileId, e.target.value)} className="text-xs">
                            {roles.map((r) => <option key={r.slug} value={r.slug}>{resolveRoleShortLabel(config, r.slug)}</option>)}
                          </Select>
                          {roleMsg[u.profileId] && <p className={cn("mt-0.5 text-[11px]", roleMsg[u.profileId] === "Saved" ? "text-emerald-600" : "text-rose-600")}>{roleMsg[u.profileId]}</p>}
                        </>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-300">{resolveRoleShortLabel(config, u.roleSlug)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center"><StatusBadge label={off ? "Deactivated" : "Active"} intent={off ? "neutral" : "success"} /></td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {membersLive && canManage ? (
                        <>
                          {resetLink[u.profileId] ? (
                            <button onClick={() => navigator.clipboard?.writeText(resetLink[u.profileId])} className="mr-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50" title="Copy the reset link to send manually"><Copy className="h-3.5 w-3.5" /> Copy reset link</button>
                          ) : resetSent[u.profileId] ? (
                            <span className="mr-2 text-xs text-slate-400">Generating…</span>
                          ) : (
                            <button onClick={() => sendReset(u.profileId, u.email)} className="mr-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Send password reset"><KeyRound className="h-3.5 w-3.5" /> Reset</button>
                          )}
                          {off ? (
                            <button onClick={() => toggleActive(u.profileId, false)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50"><RotateCcw className="h-3.5 w-3.5" /> Reactivate</button>
                          ) : (
                            <button onClick={() => toggleActive(u.profileId, true)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-500 hover:bg-rose-50"><Ban className="h-3.5 w-3.5" /> Deactivate</button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">Manage in a live workspace</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><MailCheck className="h-3.5 w-3.5" /> Deactivating ends a person's access immediately but keeps their history (shifts, chemical logs, reports) intact and still attributed to them.</p>
      </SectionCard>

      <InviteStaffModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
