"use client";

import Link from "next/link";
import { Check, ArrowRight, Rocket, Users2, FlaskConical, CalendarCog } from "lucide-react";
import { SETUP_PACKAGES, getPlan } from "@poolops/shared";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/marketing-chrome";
import { OrgSetupWizard } from "@/components/setup/org-setup-wizard";
import { useSession } from "@/lib/session";
import { useHydrated } from "@/lib/access";

const STEPS = [
  { icon: Users2, title: "Import your team", desc: "Upload staff via CSV (placeholder) or invite them by email. Assign roles and home facilities." },
  { icon: CalendarCog, title: "Configure facilities & hours", desc: "Add each facility, its pools, operating hours, and required lifeguard coverage." },
  { icon: FlaskConical, title: "Set chemical ranges & checklists", desc: "Define safe chemical ranges and opening/closing checklists for each pool." },
  { icon: Rocket, title: "Generate & publish a schedule", desc: "Use the Auto Builder to draft next week's coverage, review it, and publish to staff." },
];

export default function SetupPage() {
  const hydrated = useHydrated();
  const mode = useSession((s) => s.mode);
  const hasOrg = useSession((s) => s.hasOrganization);

  // Authenticated real customer without an organization → org-creation wizard.
  if (hydrated && mode === "real" && !hasOrg) return <OrgSetupWizard />;

  return (
    <div className="min-h-full bg-white">
      <MarketingHeader />
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Setup &amp; onboarding</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Most pools are live within a week. Sign up to create your organization, or choose a setup package below.</p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {SETUP_PACKAGES.map((s) => (
            <div key={s.tier} className="card p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{s.name}</h2>
                <span className="chip bg-brand-50 text-brand-700">{s.priceLabel}</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{s.summary}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {s.includes.map((x) => <li key={x} className="flex items-start gap-2 text-slate-600"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {x}</li>)}
              </ul>
              <p className="mt-4 text-xs text-slate-400">Best for {getPlan(s.bestForTier).name}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-14 text-2xl font-bold text-slate-900">Self-guided setup in 4 steps</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card flex gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><s.icon className="h-5 w-5" /></span>
              <div>
                <p className="text-xs font-semibold text-brand-600">Step {i + 1}</p>
                <h3 className="font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className="btn-primary px-6 py-2.5">Sign up &amp; create your organization <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/quote" className="btn-secondary px-6 py-2.5">Request guided setup</Link>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
