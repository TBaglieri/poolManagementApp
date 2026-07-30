"use client";

import { useState } from "react";
import { KeyRound, Loader2, Check, AlertCircle } from "lucide-react";
import { getEffectiveDataMode } from "@poolops/supabase";
import { useAccess } from "@/lib/access";
import { reauthenticate, updatePassword } from "@/lib/auth";
import { validatePasswordChange } from "@/lib/accounts";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

/**
 * My Account → Change password. Available to EVERY signed-in role for their OWN
 * account only. Requires the current password (verified by re-authenticating, since
 * Supabase's updateUser doesn't check it), a confirmed new password meeting policy,
 * and never logs or displays password values. Changing anyone else's password is an
 * admin action in Users & Access, enforced server-side.
 */
export default function SecurityPage() {
  const { email, mode } = useAccess();
  const supabaseMode = getEffectiveDataMode() === "supabase";

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const v = validatePasswordChange(current, next, confirm);
    if (!v.ok) { setState("error"); setMessage(v.error); return; }
    if (!supabaseMode || mode !== "real" || !email) {
      setState("error"); setMessage("Changing your password requires a real signed-in account (not demo mode).");
      return;
    }

    setState("busy");
    // 1) Verify the CURRENT password (guards a hijacked session).
    const reauth = await reauthenticate(email, current);
    if (!reauth.ok) { setState("error"); setMessage(reauth.error); return; }
    // 2) Set the new password (own account only — Supabase enforces).
    const res = await updatePassword(next);
    if (!res.ok) { setState("error"); setMessage(res.error || "Couldn't update your password."); return; }

    setState("success");
    setMessage("Your password was updated. Any other active sessions may need to sign in again.");
    setCurrent(""); setNext(""); setConfirm("");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Account" subtitle="Manage your own sign-in and password." />

      <SectionCard title="Change password" subtitle="Update the password for your own account." icon={<KeyRound className="h-4 w-4 text-brand-600" />}>
        <form onSubmit={submit} className="max-w-md space-y-4">
          <Field label="Current password" required>
            <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" placeholder="Your current password" />
          </Field>
          <Field label="New password" required hint="At least 8 characters, with a letter and a number.">
            <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" placeholder="Choose a new password" />
          </Field>
          <Field label="Confirm new password" required>
            <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" placeholder="Re-enter your new password" />
          </Field>

          {message && (
            <p className={state === "success" ? "flex items-center gap-1.5 text-xs text-emerald-600" : "flex items-center gap-1.5 text-xs text-rose-600"}>
              {state === "success" ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />} {message}
            </p>
          )}

          <Button type="submit" disabled={state === "busy"} icon={state === "busy" ? undefined : "KeyRound"}>
            {state === "busy" ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</> : "Update password"}
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}
