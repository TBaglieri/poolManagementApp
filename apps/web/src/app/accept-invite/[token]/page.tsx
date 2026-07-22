"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, MailCheck, ArrowRight, Lock, AlertCircle } from "lucide-react";
import { getRole, facilityName } from "@poolops/shared";
import { getEffectiveDataMode } from "@poolops/supabase";
import { useInvites } from "@/lib/invites";
import { signUp } from "@/lib/auth";
import { useSession } from "@/lib/session";
import { Logo } from "@/components/brand";
import { RoleBadge } from "@/components/ui/badge";

export default function AcceptInvitePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const invites = useInvites((s) => s.invites);
  const acceptInvite = useInvites((s) => s.acceptInvite);
  const loginReal = useSession((s) => s.loginReal);

  const invite = invites.find((i) => i.token === token);
  const supabaseMode = getEffectiveDataMode() === "supabase";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const accept = async () => {
    if (!invite) return;
    setError(null); setBusy(true);
    if (supabaseMode) {
      // Real: create the auth user for the invited email, then link the invite.
      const res = await signUp(invite.email, password || Math.random().toString(36).slice(2) + "Aa1!", {
        first_name: invite.firstName, last_name: invite.lastName, invite_token: token, role: invite.role,
      });
      if (!res.ok) { setBusy(false); setError(res.error); return; }
    }
    acceptInvite(token);
    setBusy(false); setDone(true);
    if (supabaseMode) {
      loginReal(invite.email, invite.role, true);
      setTimeout(() => router.push("/m/home"), 1200);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-cyan-50 px-4">
      <div className="card w-full max-w-md overflow-hidden shadow-lift">
        <div className="border-b border-slate-100 px-6 py-5"><Logo size="md" /></div>
        <div className="px-6 py-6">
          {!invite ? (
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500"><AlertCircle className="h-7 w-7" /></span>
              <h1 className="mt-4 text-lg font-bold text-slate-900">Invitation not found</h1>
              <p className="mt-1 text-sm text-slate-500">This invite link is invalid, expired, or was created on another device. Ask your manager to resend it.</p>
              {supabaseMode && <p className="mt-2 text-xs text-slate-400">In Supabase mode, invites are stored in <code>staff_invitations</code> — run the schema + seed to enable cross-device acceptance.</p>}
              <Link href="/login" className="btn-secondary mt-5">Go to sign in</Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></span>
              <h1 className="mt-4 text-lg font-bold text-slate-900">Welcome aboard, {invite.firstName}!</h1>
              <p className="mt-1 text-sm text-slate-500">Your invitation as {getRole(invite.role).name} has been accepted{supabaseMode ? " and your account created" : ""}.</p>
              {!supabaseMode && <Link href="/login" className="btn-primary mt-5">Continue to sign in <ArrowRight className="h-4 w-4" /></Link>}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-brand-600"><MailCheck className="h-5 w-5" /><span className="text-sm font-semibold">You've been invited</span></div>
              <h1 className="mt-2 text-xl font-bold text-slate-900">Join {invite.firstName ? "the team" : "PoolOps Pro"}</h1>
              <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
                <p className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium text-slate-800">{invite.firstName} {invite.lastName}</span></p>
                <p className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium text-slate-800">{invite.email}</span></p>
                <p className="flex items-center justify-between"><span className="text-slate-500">Role</span><RoleBadge role={invite.role} /></p>
                <p className="flex justify-between"><span className="text-slate-500">Facility</span><span className="font-medium text-slate-800">{facilityName(invite.homeFacilityId)}</span></p>
              </div>

              {supabaseMode && (
                <div className="mt-4">
                  <label className="label">Set a password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input className="input pl-9" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose a password (min 6 chars)" />
                  </div>
                </div>
              )}

              {error && <p className="mt-3 flex items-center gap-1.5 text-xs text-rose-600"><AlertCircle className="h-4 w-4" /> {error}</p>}

              <button onClick={accept} disabled={busy} className="btn-primary mt-5 w-full justify-center py-2.5">
                {busy ? "Accepting…" : "Accept invitation"} <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-3 text-center text-xs text-slate-400">By accepting you'll be added to the organization with the role above.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
