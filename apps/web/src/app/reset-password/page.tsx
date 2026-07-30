"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Loader2, Check, AlertCircle, ArrowRight } from "lucide-react";
import { isPlatformSlug, isDemoTenant, type TenantChoice } from "@poolops/shared";
import { getBrowserSupabase, getEffectiveDataMode } from "@poolops/supabase";
import { useTenantConfig } from "@/lib/tenant/provider";
import { updatePassword, signOut } from "@/lib/auth";
import { resolveTenantAndRedirect, hardNavigateTenant } from "@/lib/tenant/post-auth-redirect";
import { validatePassword } from "@/lib/accounts";
import { TenantWordmark } from "@/components/theme/tenant-brand";
import { PasswordInput } from "@/components/ui/password-input";

type Phase = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const config = useTenantConfig();
  const supabaseMode = getEffectiveDataMode() === "supabase";
  const tenantScoped = !isPlatformSlug(config.slug) && !isDemoTenant(config);
  const loginHref = tenantScoped ? `/${config.slug}/login` : "/login";
  const forgotHref = tenantScoped ? `/${config.slug}/forgot-password` : "/forgot-password";

  const [phase, setPhase] = useState<Phase>(supabaseMode ? "checking" : "invalid");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Multi-tenant users pick their workspace (never a silent guess); a valid account
  // with no tenant provisioned hits a clear dead-end, never a drop into root.
  const [pickTenant, setPickTenant] = useState<TenantChoice[] | null>(null);
  const [noAccess, setNoAccess] = useState(false);

  // The recovery link establishes a temporary session (detectSessionInUrl). Wait for
  // it, or the PASSWORD_RECOVERY event, before allowing a new password to be set.
  useEffect(() => {
    if (!supabaseMode) return;
    const client = getBrowserSupabase();
    if (!client) { setPhase("invalid"); return; }
    let settled = false;
    const markReady = () => { settled = true; setPhase("ready"); };
    client.auth.getSession().then(({ data }) => { if (data.session && !settled) markReady(); });
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) markReady();
    });
    const t = setTimeout(() => { if (!settled) setPhase((p) => (p === "checking" ? "invalid" : p)); }, 4000);
    return () => { clearTimeout(t); sub.subscription.unsubscribe(); };
  }, [supabaseMode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validatePassword(password);
    if (!v.ok) { setError(v.error); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }

    setBusy(true);
    const res = await updatePassword(password);
    if (!res.ok) { setBusy(false); setError(res.error || "Couldn't update your password. The link may have expired."); return; }

    // The recovery link already established the session, and updateUser refreshed it.
    // Resolve the real identity and route through the ONE shared post-auth decision —
    // identical to login. A tenant user ALWAYS lands in their tenant, never root.
    const client = getBrowserSupabase();
    const { data } = (await client?.auth.getUser()) ?? { data: { user: null } };
    if (!data.user) { setBusy(false); setError("Your session expired. Request a new reset link."); return; }

    await resolveTenantAndRedirect(data.user.id, {
      onTenant: (choice) => { setPhase("done"); setTimeout(() => hardNavigateTenant(choice), 1200); },
      onPicker: (memberships) => { setBusy(false); setPickTenant(memberships); },
      onPlatform: () => { setPhase("done"); setTimeout(() => router.push("/dashboard"), 1200); },
      // Password was reset, but the account has no workspace — a clear dead-end.
      // Drop the session so a half-authed state can't linger.
      onNoAccess: async () => { setBusy(false); await signOut(); setNoAccess(true); },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-cyan-50 px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="card w-full max-w-md overflow-hidden shadow-lift">
        <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800"><TenantWordmark size="md" /></div>
        <div className="px-6 py-6">
          {phase === "checking" && (
            <div className="flex flex-col items-center py-8 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
              <p className="mt-3 text-sm text-slate-500">Verifying your reset link…</p>
            </div>
          )}

          {phase === "invalid" && (
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500"><AlertCircle className="h-7 w-7" /></span>
              <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">This reset link isn't valid</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Reset links are single-use and expire. Request a new one to continue.</p>
              <Link href={forgotHref} className="btn-primary mt-5 inline-flex">Request a new link</Link>
            </div>
          )}

          {phase === "done" && (
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Check className="h-7 w-7" /></span>
              <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">Password updated</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">You're signed in — taking you in…</p>
            </div>
          )}

          {/* Password reset, but the account belongs to no workspace — a clear
              dead-end, NEVER a silent drop into the platform/root context. */}
          {noAccess && (
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><AlertCircle className="h-7 w-7" /></span>
              <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">Password updated</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your new password is set, but your account isn't a member of any workspace yet. Contact your administrator to be added.</p>
              <Link href={loginHref} className="btn-secondary mt-5 inline-flex">Back to sign in</Link>
            </div>
          )}

          {/* More than one workspace → let the user choose (no silent guess). Enter
              with a HARD navigation so the tenant context loads fresh. */}
          {pickTenant && pickTenant.length > 0 && (
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Password updated</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose the workspace to continue to.</p>
              <div className="mt-4 grid gap-2">
                {pickTenant.map((t) => (
                  <button key={t.slug} type="button" onClick={() => hardNavigateTenant(t)}
                    className="group flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-800 transition-colors hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-700 dark:text-slate-100">
                    <span className="truncate">{t.orgName ?? t.slug}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === "ready" && !pickTenant && !noAccess && (
            <>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Set a new password</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose a strong password you'll remember.</p>
              <form onSubmit={submit} className="mt-5 space-y-4">
                <div>
                  <label className="label">New password</label>
                  <PasswordInput leadingIcon={<Lock className="h-4 w-4" />} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters, with a number" autoComplete="new-password" />
                </div>
                <div>
                  <label className="label">Confirm new password</label>
                  <PasswordInput leadingIcon={<Lock className="h-4 w-4" />} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your new password" autoComplete="new-password" />
                </div>
                {error && <p className="flex items-center gap-1.5 text-xs text-rose-600"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</p>}
                <button type="submit" disabled={busy} className="btn-primary w-full justify-center py-2.5">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Update password
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
