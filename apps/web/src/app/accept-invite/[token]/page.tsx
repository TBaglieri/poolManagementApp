"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, MailCheck, ArrowRight, Lock, AlertCircle, Loader2 } from "lucide-react";
import { getRole, facilityName, type RoleSlug } from "@poolops/shared";
import { getEffectiveDataMode } from "@poolops/supabase";
import { useInvites } from "@/lib/invites";
import { signUp, signIn } from "@/lib/auth";
import { useSession } from "@/lib/session";
import { validatePassword, inviteAcceptable } from "@/lib/accounts";
import { Logo } from "@/components/brand";
import { RoleBadge } from "@/components/ui/badge";

interface ResolvedInvite {
  email: string;
  firstName: string;
  lastName: string;
  role: RoleSlug;
  homeFacilityId: string;
  status: "draft" | "sent" | "pending" | "accepted" | "expired" | "canceled";
  expiresAt: string;
}

export default function AcceptInvitePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const localInvites = useInvites((s) => s.invites);
  const acceptInvite = useInvites((s) => s.acceptInvite);
  const loginReal = useSession((s) => s.loginReal);
  const supabaseMode = getEffectiveDataMode() === "supabase";

  const local = localInvites.find((i) => i.token === token);
  const [remote, setRemote] = useState<ResolvedInvite | null>(null);
  const [loading, setLoading] = useState(supabaseMode && !local);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Cross-device: if the invite isn't in this browser, fetch it by token.
  useEffect(() => {
    if (local || !supabaseMode) { setLoading(false); return; }
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/invite/${encodeURIComponent(token)}`);
        const json = await res.json();
        if (active && json.ok) setRemote(json.invite);
      } catch { /* leave as not-found */ }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [local, supabaseMode, token]);

  const invite: ResolvedInvite | null = local
    ? { email: local.email, firstName: local.firstName, lastName: local.lastName, role: local.role, homeFacilityId: local.homeFacilityId, status: local.status, expiresAt: local.expiresAt }
    : remote;

  const acceptable = inviteAcceptable(invite);

  const accept = async () => {
    if (!invite) return;
    setError(null);

    if (supabaseMode) {
      const pw = validatePassword(password);
      if (!pw.ok) { setError(pw.error); return; }
    }
    setBusy(true);

    if (supabaseMode) {
      const res = await signUp(invite.email, password, {
        first_name: invite.firstName, last_name: invite.lastName, invite_token: token, role: invite.role,
      });
      if (!res.ok) {
        setBusy(false);
        // Duplicate account is a common, recoverable case.
        setError(/already registered|exists/i.test(res.error ?? "")
          ? "You already have an account. Please sign in instead."
          : res.error);
        return;
      }
    }

    acceptInvite(token);
    setBusy(false);
    setDone(true);
    if (supabaseMode) {
      // Establish a session (sign in with the password they just set), then land in-app.
      await signIn(invite.email, password).catch(() => {});
      loginReal(invite.email, invite.role, true);
      setTimeout(() => router.push("/dashboard"), 1000);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-cyan-50 px-4">
      <div className="card w-full max-w-md overflow-hidden shadow-lift">
        <div className="border-b border-slate-100 px-6 py-5"><Logo size="md" /></div>
        <div className="px-6 py-6">
          {loading ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
              <p className="mt-3 text-sm text-slate-500">Checking your invitation…</p>
            </div>
          ) : !invite || !acceptable.ok ? (
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500"><AlertCircle className="h-7 w-7" /></span>
              <h1 className="mt-4 text-lg font-bold text-slate-900">Can't accept this invite</h1>
              <p className="mt-1 text-sm text-slate-500">{acceptable.error}</p>
              <Link href="/login" className="btn-secondary mt-5">Go to sign in</Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></span>
              <h1 className="mt-4 text-lg font-bold text-slate-900">Welcome aboard, {invite.firstName}!</h1>
              <p className="mt-1 text-sm text-slate-500">Your account as {getRole(invite.role).name} is ready{supabaseMode ? " — taking you in…" : "."}</p>
              {!supabaseMode && <Link href="/login" className="btn-primary mt-5">Continue to sign in <ArrowRight className="h-4 w-4" /></Link>}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-brand-600"><MailCheck className="h-5 w-5" /><span className="text-sm font-semibold">You've been invited</span></div>
              <h1 className="mt-2 text-xl font-bold text-slate-900">Set up your account</h1>
              <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
                <p className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium text-slate-800">{invite.firstName} {invite.lastName}</span></p>
                <p className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium text-slate-800">{invite.email}</span></p>
                <p className="flex items-center justify-between"><span className="text-slate-500">Role</span><RoleBadge role={invite.role} /></p>
                <p className="flex justify-between"><span className="text-slate-500">Facility</span><span className="font-medium text-slate-800">{facilityName(invite.homeFacilityId)}</span></p>
              </div>

              {supabaseMode && (
                <div className="mt-4">
                  <label className="label">Choose a password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input className="input pl-9" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters, with a number" autoComplete="new-password" />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">You'll sign in with this each time — everything you do is recorded under your name.</p>
                </div>
              )}

              {error && <p className="mt-3 flex items-center gap-1.5 text-xs text-rose-600"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</p>}

              <button onClick={accept} disabled={busy} className="btn-primary mt-5 w-full justify-center py-2.5">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up…</> : <>Accept &amp; create account <ArrowRight className="h-4 w-4" /></>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
