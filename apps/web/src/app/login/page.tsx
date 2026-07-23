"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Monitor, Smartphone, Mail, Lock, Check, Loader2, AlertCircle, Database } from "lucide-react";
import { ROLE_LIST, getRole, isDemoTenant, isPlatformSlug, resolveAssignedRole, landingPathForRole, type RoleSlug } from "@poolops/shared";
import { getEffectiveDataMode } from "@poolops/supabase";
import { useSession } from "@/lib/session";
import { useTenantConfig } from "@/lib/tenant/provider";
import { allowsDemoLoginFallback } from "@/lib/demo-mode";
import { resolveUserTenant } from "@/lib/tenant/user-tenant";
import { signIn } from "@/lib/auth";
import { TenantWordmark } from "@/components/theme/tenant-brand";
import { RoleBadge } from "@/components/ui/badge";

function surfaceHref(role: RoleSlug): string {
  return getRole(role).surface === "mobile" ? "/m/home" : "/dashboard";
}

const FEATURED: RoleSlug[] = ["org_admin", "lifeguard", "lifeguard_manager", "payroll_team", "swim_instructor"];

export default function LoginPage() {
  const router = useRouter();
  const enterDemo = useSession((s) => s.enterDemo);
  const loginReal = useSession((s) => s.loginReal);
  const setUserName = useSession((s) => s.setUserName);
  const setStaffLink = useSession((s) => s.setStaffLink);
  const setRealOrg = useSession((s) => s.setRealOrg);
  const config = useTenantConfig();
  const isDemo = isDemoTenant(config);
  const supabaseMode = getEffectiveDataMode() === "supabase";
  const [email, setEmail] = useState(supabaseMode ? "" : "director@tideandtown.example");
  const [password, setPassword] = useState(supabaseMode ? "" : "demo-password");
  const [showAll, setShowAll] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);

  // DEMO: preview the product as any role on seeded data (clearly separated).
  const enter = (role: RoleSlug) => {
    enterDemo(role);
    router.push(surfaceHref(role));
  };

  // REAL Supabase auth. New users have no org yet → routed to /setup to create one.
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null); setAuthInfo(null);
    if (!supabaseMode) {
      // Demo TENANT without a backend: the form is a shortcut into the demo admin.
      // A REAL tenant NEVER falls back to a demo user — it requires real auth.
      if (allowsDemoLoginFallback(isDemo, supabaseMode)) { enter("org_admin"); return; }
      setAuthError("Real sign-in isn't configured for this workspace. Set NEXT_PUBLIC_DATA_MODE=supabase (with your Supabase URL + anon key) to enable authentication.");
      return;
    }
    if (!email || !password) { setAuthError("Enter an email and password."); return; }
    setBusy(true);
    const res = await signIn(email, password);
    if (!res.ok) { setBusy(false); setAuthError(res.error); return; }

    // Look up the tenant this account belongs to and drop the user straight into
    // it (e.g. /villas/dashboard) — they never need to know or type the slug.
    const ut = res.user ? await resolveUserTenant(res.user.id) : { slug: null, orgName: null, role: null, firstName: null, staffId: null, staffLinked: null };
    setBusy(false);
    // Never escalate on a missing role — fall back to the tenant's LOWEST privilege.
    const assignedRole = resolveAssignedRole(config, ut.role);
    loginReal(email, assignedRole, true);
    setUserName(ut.firstName ?? (email.includes("@") ? email.split("@")[0] : email));
    setStaffLink(ut.staffId, ut.staffLinked === true);
    if (ut.staffLinked === false) console.warn(`[staff-link] ${email} signed in with an org membership but no linked staff profile — self-service features will show the "profile not set up" state. Run scripts/link-staff-profiles.ts.`);
    if (ut.orgName) setRealOrg(ut.orgName, "small");
    // Land on a page this role can actually use (lifeguards → Schedule, not a
    // restricted Dashboard).
    const home = landingPathForRole(assignedRole);
    router.push(ut.slug ? `/${ut.slug}${home}` : home);
  };

  const others = ROLE_LIST.filter((r) => !FEATURED.includes(r.slug));
  // Carry tenant context so the reset link returns the user to the right place.
  const tenantScoped = !isPlatformSlug(config.slug) && !isDemoTenant(config);
  const forgotHref = tenantScoped ? `/${config.slug}/forgot-password` : "/forgot-password";

  return (
    <div className="flex min-h-full">
      {/* Left: form */}
      <div className="flex w-full flex-col justify-center px-6 py-10 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link href="/"><TenantWordmark size="md" /></Link>
          <h1 className="mt-10 text-2xl font-bold text-slate-900">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {supabaseMode ? "Sign in with Supabase Auth to your aquatics workspace." : "Sign in to your aquatics operations workspace."}
          </p>

          {supabaseMode && (
            <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <Database className="h-3.5 w-3.5" /> Supabase mode — real authentication
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleAuth}>
            <div>
              <label className="label">Work email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@yourpool.org" autoComplete="email" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label">Password</label>
                {supabaseMode && mode === "signin" && (
                  <Link href={forgotHref} className="text-xs font-medium text-brand-600 hover:text-brand-700">Forgot password?</Link>
                )}
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder={mode === "signup" ? "Choose a password (min 6 chars)" : "Your password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
              </div>
            </div>

            {authError && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {authError}
              </div>
            )}
            {authInfo && (
              <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0" /> {authInfo}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {supabaseMode ? (mode === "signin" ? "Sign in" : "Create account") : "Sign in as Pool Director"}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>

            {/* No public self-service sign-up: accounts are provisioned by an admin
                (email invite). The demo tenant uses the role switcher below. */}
            <p className="text-center text-xs text-slate-400">
              {isDemo
                ? "Or continue as a demo role below."
                : "Accounts are provisioned by your administrator. Contact them if you need access."}
            </p>
          </form>

          {/* Demo role switcher — ONLY on the gated demo tenant, never in public UI. */}
          {isDemo && (
            <>
              <div className="my-7 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or continue as a demo role</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {FEATURED.map((slug) => {
                  const r = getRole(slug);
                  return (
                    <button key={slug} onClick={() => enter(slug)}
                      className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition-all hover:border-brand-300 hover:bg-brand-50/40 hover:shadow-card">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-800">{r.shortName}</span>
                        <span className="block truncate text-xs text-slate-400">{r.surface === "mobile" ? "Mobile-first" : r.surface === "both" ? "Web + mobile" : "Web"}</span>
                      </span>
                      {r.surface === "mobile" ? <Smartphone className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-600" /> : <Monitor className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-600" />}
                    </button>
                  );
                })}
              </div>

              <button onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm font-medium text-brand-700 hover:text-brand-800">
                {showAll ? "Hide" : "Show all 12 roles"}
              </button>
              {showAll && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {others.map((r) => (
                    <button key={r.slug} onClick={() => enter(r.slug)} className="transition-transform hover:scale-105">
                      <RoleBadge role={r.slug} />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: brand panel */}
      <div className="relative hidden overflow-hidden bg-navy-950 lg:flex lg:w-1/2">
        <div className="absolute -right-20 top-10 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <TenantWordmark size="lg" mono />
          <h2 className="mt-10 text-3xl font-bold leading-tight">
            {tenantScoped ? config.copy.welcome : "The operations layer for modern aquatics teams."}
          </h2>
          <ul className="mt-8 space-y-4 text-white/80">
            {["Schedule coverage and approve trades in seconds",
              "Keep chemical & inspection records audit-ready",
              "Onboard seasonal staff before opening day",
              "Sync the office and the deck in real time"].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/30 text-brand-200"><Check className="h-3 w-3" /></span>
                {t}
              </li>
            ))}
          </ul>
          {/* Marketing testimonial only on the platform login — a real tenant portal
              shows its own tagline, never a demo persona quote. */}
          <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-5">
            {tenantScoped ? (
              <p className="text-sm text-white/70">{config.copy.tagline}</p>
            ) : (
              <>
                <p className="text-sm text-white/70">“PoolOps Pro replaced three spreadsheets, a group text, and a clipboard. Our guards actually use it.”</p>
                <p className="mt-3 text-xs font-semibold text-white/50">— Aquatics Director, demo persona</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
