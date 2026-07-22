"use client";

import { useMemo, useState } from "react";
import { Mail, Send, CheckCircle2, Copy, AlertTriangle, ShieldAlert } from "lucide-react";
import { ROLE_LIST, getRole, facilities, type RoleSlug } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useInvites, MGMT_PERMISSION_LABELS, DEFAULT_MGMT_PERMS, type ManagementPermissions } from "@/lib/invites";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const EMPLOYMENT = ["active", "seasonal", "pending_onboarding"];

export function InviteStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { role, roleMeta, staffId } = useAccess();
  const createInvite = useInvites((s) => s.createInvite);

  const isAdmin = role === "org_admin" || role === "super_admin";
  const myLevel = roleMeta?.level ?? 0;

  // Hierarchy: admins can assign any non-superadmin role; others only BELOW their level.
  const assignableRoles = useMemo(
    () => ROLE_LIST.filter((r) => r.slug !== "super_admin" && (isAdmin || r.level < myLevel)),
    [isAdmin, myLevel],
  );

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleSlug, setRoleSlug] = useState<RoleSlug>("lifeguard");
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? "");
  const [phone, setPhone] = useState("");
  const [employment, setEmployment] = useState("active");
  const [perms, setPerms] = useState<ManagementPermissions>({ ...DEFAULT_MGMT_PERMS });
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setEmail(""); setFirstName(""); setLastName(""); setRoleSlug("lifeguard");
    setPhone(""); setEmployment("active"); setPerms({ ...DEFAULT_MGMT_PERMS }); setCreatedLink(null); setCopied(false);
  };

  const submit = () => {
    if (!email.trim() || !firstName.trim()) return;
    const invite = createInvite(
      { email, firstName, lastName, role: roleSlug, homeFacilityId: facilityId, phone, employmentStatus: employment, managementPermissions: perms },
      staffId ?? "system",
    );
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setCreatedLink(`${origin}/accept-invite/${invite.token}`);
  };

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title={createdLink ? "Invitation created" : "Invite a staff member"}
      description={createdLink ? undefined : "Create an account by email and assign a role. They'll accept via an invite link."}
      size="lg"
      footer={createdLink ? (
        <>
          <Button variant="secondary" onClick={reset}>Invite another</Button>
          <Button onClick={() => { reset(); onClose(); }}>Done</Button>
        </>
      ) : (
        <>
          <Button variant="secondary" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button icon="Send" onClick={submit} disabled={!email.trim() || !firstName.trim()}>Create invite</Button>
        </>
      )}
    >
      {createdLink ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" /> Invite created for <strong>{email}</strong> as {getRole(roleSlug).name}.
          </div>
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-4 w-4" /> Email sending not configured yet</p>
            <p className="mt-1 text-xs">Share this invite link manually, or wire a provider (Resend/Twilio) + the <code>/api/admin/invite-user</code> route to email it automatically.</p>
          </div>
          <Field label="Invite link">
            <div className="flex gap-2">
              <Input readOnly value={createdLink} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
              <Button variant="secondary" icon={copied ? "Check" : "Copy"} onClick={() => { navigator.clipboard?.writeText(createdLink); setCopied(true); }}>{copied ? "Copied" : "Copy"}</Button>
            </div>
          </Field>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" required><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@yourpool.org" /></div></Field>
            <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-0123" /></Field>
            <Field label="First name" required><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
            <Field label="Last name"><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
            <Field label="Role"><Select value={roleSlug} onChange={(e) => setRoleSlug(e.target.value as RoleSlug)}>{assignableRoles.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}</Select></Field>
            <Field label="Home facility"><Select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
            <Field label="Employment status"><Select value={employment} onChange={(e) => setEmployment(e.target.value)}>{EMPLOYMENT.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</Select></Field>
          </div>

          {!isAdmin && (
            <p className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <ShieldAlert className="h-3.5 w-3.5" /> You can only assign roles within your permission level. Only organization admins can grant management permissions.
            </p>
          )}

          <div>
            <p className="label">Management permissions {!isAdmin && <span className="text-xs font-normal text-slate-400">(admins only)</span>}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {MGMT_PERMISSION_LABELS.map(({ key, label }) => (
                <button key={key} type="button" disabled={!isAdmin}
                  onClick={() => setPerms((p) => ({ ...p, [key]: !p[key] }))}
                  className={cn("flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50",
                    perms[key] ? "border-brand-300 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>
                  {label}
                  <span className={cn("h-4 w-4 rounded-full border", perms[key] ? "border-brand-500 bg-brand-500" : "border-slate-300")} />
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">Deactivating a user later removes access but keeps historical records.</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
