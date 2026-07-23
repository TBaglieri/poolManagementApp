"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, Check, AlertCircle } from "lucide-react";
import { isPlatformSlug, isDemoTenant } from "@poolops/shared";
import { getEffectiveDataMode } from "@poolops/supabase";
import { useTenantConfig } from "@/lib/tenant/provider";
import { sendPasswordReset } from "@/lib/auth";
import { validateEmail, RESET_REQUEST_NEUTRAL_MESSAGE } from "@/lib/accounts";
import { TenantWordmark } from "@/components/theme/tenant-brand";

export default function ForgotPasswordPage() {
  const config = useTenantConfig();
  const supabaseMode = getEffectiveDataMode() === "supabase";
  const tenantScoped = !isPlatformSlug(config.slug) && !isDemoTenant(config);
  const loginHref = tenantScoped ? `/${config.slug}/login` : "/login";

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validateEmail(email);
    if (!v.ok) { setError(v.error); return; }
    if (!supabaseMode) { setError("Password reset isn't available in local demo mode."); return; }

    setBusy(true);
    // Return the user to THIS tenant's reset page after they click the emailed link.
    const origin = window.location.origin;
    const redirectTo = `${origin}${tenantScoped ? `/${config.slug}` : ""}/reset-password`;
    await sendPasswordReset(email, redirectTo);
    setBusy(false);
    // NEUTRAL response — never reveal whether the email has an account.
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-cyan-50 px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="card w-full max-w-md overflow-hidden shadow-lift">
        <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800"><TenantWordmark size="md" /></div>
        <div className="px-6 py-6">
          {sent ? (
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Check className="h-7 w-7" /></span>
              <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">Check your email</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{RESET_REQUEST_NEUTRAL_MESSAGE}</p>
              <Link href={loginHref} className="btn-secondary mt-5 inline-flex"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Reset your password</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enter your work email and we'll send a link to set a new password.</p>
              <form onSubmit={submit} className="mt-5 space-y-4">
                <div>
                  <label className="label">Work email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input className="input pl-9" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourpool.org" autoComplete="email" />
                  </div>
                </div>
                {error && <p className="flex items-center gap-1.5 text-xs text-rose-600"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</p>}
                <button type="submit" disabled={busy} className="btn-primary w-full justify-center py-2.5">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send reset link
                </button>
                <Link href={loginHref} className="flex items-center justify-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"><ArrowLeft className="h-3.5 w-3.5" /> Back to sign in</Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
