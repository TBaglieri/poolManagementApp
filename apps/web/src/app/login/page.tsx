"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Monitor, Smartphone, Mail, Lock, Check } from "lucide-react";
import { ROLE_LIST, getRole, type RoleSlug } from "@poolops/shared";
import { useSession } from "@/lib/session";
import { Logo } from "@/components/brand";
import { RoleBadge } from "@/components/ui/badge";

function surfaceHref(role: RoleSlug): string {
  return getRole(role).surface === "mobile" ? "/m/home" : "/dashboard";
}

const FEATURED: RoleSlug[] = ["org_admin", "lifeguard", "lifeguard_manager", "payroll_team", "swim_instructor"];

export default function LoginPage() {
  const router = useRouter();
  const loginAs = useSession((s) => s.loginAs);
  const [email, setEmail] = useState("director@tideandtown.example");
  const [password, setPassword] = useState("demo-password");
  const [showAll, setShowAll] = useState(false);

  const enter = (role: RoleSlug) => {
    loginAs(role);
    router.push(surfaceHref(role));
  };

  const others = ROLE_LIST.filter((r) => !FEATURED.includes(r.slug));

  return (
    <div className="flex min-h-full">
      {/* Left: form */}
      <div className="flex w-full flex-col justify-center px-6 py-10 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link href="/"><Logo size="md" /></Link>
          <h1 className="mt-10 text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-1.5 text-sm text-slate-500">Sign in to your aquatics operations workspace.</p>

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => { e.preventDefault(); enter("org_admin"); }}
          >
            <div>
              <label className="label">Work email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-2.5">
              Sign in as Pool Director <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-center text-xs text-slate-400">
              Demo mode · mock authentication. Supabase Auth is wired for production (see SUPABASE_SETUP.md).
            </p>
          </form>

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
        </div>
      </div>

      {/* Right: brand panel */}
      <div className="relative hidden overflow-hidden bg-navy-950 lg:flex lg:w-1/2">
        <div className="absolute -right-20 top-10 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <Logo size="lg" mono />
          <h2 className="mt-10 text-3xl font-bold leading-tight">
            The operations layer for modern aquatics teams.
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
          <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-white/70">“PoolOps Pro replaced three spreadsheets, a group text, and a clipboard. Our guards actually use it.”</p>
            <p className="mt-3 text-xs font-semibold text-white/50">— Aquatics Director, demo persona</p>
          </div>
        </div>
      </div>
    </div>
  );
}
