"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check, X, Sparkles, ArrowRight, Wand2, Building2, Waves, Users, HelpCircle, ChevronDown,
} from "lucide-react";
import {
  SUBSCRIPTION_PLANS, PLAN_COMPARISON, SETUP_PACKAGES, PRICING_FAQ, recommendPlan,
  formatCurrency, getPlan, type PlanTier, type SubscriptionPlan,
} from "@poolops/shared";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/marketing-chrome";
import { cn } from "@/lib/cn";

const ACCENT: Record<string, { ring: string; badge: string; btn: string }> = {
  cyan: { ring: "ring-brand-200", badge: "bg-brand-50 text-brand-700", btn: "btn-secondary" },
  navy: { ring: "ring-brand-500", badge: "bg-brand-600 text-white", btn: "btn-primary" },
  violet: { ring: "ring-violet-200", badge: "bg-violet-50 text-violet-700", btn: "btn-secondary" },
};

function annualSavings(p: SubscriptionPlan): number | null {
  if (p.monthly == null || p.annual == null) return null;
  return p.monthly * 12 - p.annual;
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div className="min-h-full bg-white">
      <MarketingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/70 via-white to-white" />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" /> Simple, original pricing for every pool size
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Plans that scale with your season</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            From a single neighborhood pool to a multi-site municipal aquatics department — pick a plan, or let our wizard recommend one.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <span className={cn("text-sm font-medium", !annual && "text-slate-900")}>Monthly</span>
            <button
              onClick={() => setAnnual((v) => !v)}
              className={cn("relative h-7 w-12 rounded-full transition-colors", annual ? "bg-brand-600" : "bg-slate-300")}
              aria-label="Toggle annual billing"
            >
              <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform", annual ? "left-6" : "left-1")} />
            </button>
            <span className={cn("text-sm font-medium", annual && "text-slate-900")}>
              Annual <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Save ~10%</span>
            </span>
          </div>

          <button onClick={() => setWizardOpen(true)} className="btn-secondary mt-6">
            <Wand2 className="h-4 w-4" /> Not sure? Find my plan
          </button>
        </div>
      </section>

      {/* Plan cards */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((p) => {
            const a = ACCENT[p.accent];
            const savings = annualSavings(p);
            return (
              <div key={p.tier} className={cn("card relative flex flex-col p-7 ring-1", p.popular ? "ring-2 ring-brand-500 shadow-lift" : a.ring)}>
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow">Most popular</span>
                )}
                <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{p.tagline}</p>

                <div className="mt-5">
                  {p.monthly == null ? (
                    <>
                      <p className="text-3xl font-bold text-slate-900">Custom</p>
                      <p className="mt-1 text-sm text-slate-500">Starts at {formatCurrency(p.startsAt ?? 0)}/mo · annual or PO</p>
                    </>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-slate-900">
                        {formatCurrency(annual ? Math.round((p.annual ?? 0) / 12) : p.monthly)}
                        <span className="text-base font-medium text-slate-400">/mo</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {annual ? `${formatCurrency(p.annual ?? 0)} billed annually` : "billed monthly"}
                        {annual && savings ? <span className="ml-1 font-semibold text-emerald-600">· save {formatCurrency(savings)}</span> : null}
                      </p>
                    </>
                  )}
                </div>

                <Link
                  href={p.cta === "quote" ? "/quote" : "/login"}
                  className={cn(p.popular ? "btn-primary" : a.btn, "mt-5 w-full justify-center")}
                >
                  {p.cta === "quote" ? "Request a quote" : "Start free trial"} <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="mt-6 space-y-2 border-t border-slate-100 pt-5 text-sm">
                  <p className="flex items-center gap-2 font-medium text-slate-700"><Building2 className="h-4 w-4 text-brand-600" /> {p.limits.facilities}</p>
                  <p className="flex items-center gap-2 font-medium text-slate-700"><Waves className="h-4 w-4 text-brand-600" /> {p.limits.pools}</p>
                  <p className="flex items-center gap-2 font-medium text-slate-700"><Users className="h-4 w-4 text-brand-600" /> {p.limits.activeStaff}</p>
                </div>

                <ul className="mt-5 space-y-2.5 text-sm">
                  {p.includesPrevious && (
                    <li className="font-semibold text-slate-700">Everything in {getPlan(p.includesPrevious).name}, plus:</li>
                  )}
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-slate-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison table */}
      <section className="border-y border-slate-100 bg-slate-50/60 py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900">Compare every feature</h2>
          <div className="mt-6 overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Feature</th>
                  {SUBSCRIPTION_PLANS.map((p) => (
                    <th key={p.tier} className="px-4 py-3 text-center text-sm font-semibold text-slate-800">{p.name.split(" ")[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PLAN_COMPARISON.map((row, i) => {
                  const prevGroup = PLAN_COMPARISON[i - 1]?.group;
                  return (
                    <Fragment key={row.label}>
                      {row.group !== prevGroup && (
                        <tr className="bg-slate-100/60">
                          <td colSpan={4} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">{row.group}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="px-4 py-2.5 text-slate-700">{row.label}</td>
                        {(["small", "medium", "big"] as PlanTier[]).map((t) => {
                          const v = row[t];
                          return (
                            <td key={t} className="px-4 py-2.5 text-center">
                              {typeof v === "boolean"
                                ? (v ? <Check className="mx-auto h-4 w-4 text-emerald-500" /> : <X className="mx-auto h-4 w-4 text-slate-300" />)
                                : <span className="font-medium text-slate-700">{v}</span>}
                            </td>
                          );
                        })}
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Setup packages */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-slate-900">One-time setup packages</h2>
        <p className="mt-2 text-slate-600">Get live fast — self-guided or with our team.</p>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {SETUP_PACKAGES.map((s) => (
            <div key={s.tier} className="card p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{s.name}</h3>
                <span className="chip bg-brand-50 text-brand-700">{s.priceLabel}</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{s.summary}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {s.includes.map((x) => (
                  <li key={x} className="flex items-start gap-2 text-slate-600"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {x}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-slate-400">Best for {getPlan(s.bestForTier).name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-100 bg-slate-50/60 py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900">Frequently asked questions</h2>
          <div className="mt-6 space-y-3">
            {PRICING_FAQ.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-cyan-600 px-8 py-12 text-center shadow-lift sm:px-16">
          <h2 className="text-3xl font-bold tracking-tight text-white">Need a tailored quote?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">Municipalities, districts, and multi-site operators — tell us about your facilities and we'll build a plan.</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/quote" className="btn bg-white px-6 py-3 text-base font-semibold text-brand-700 hover:bg-brand-50">Request a quote <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/login" className="btn border border-white/40 px-6 py-3 text-base font-semibold text-white hover:bg-white/10">Explore the demo</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />

      {wizardOpen && <PlanWizard onClose={() => setWizardOpen(false)} />}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span className="flex items-center gap-2 font-medium text-slate-800"><HelpCircle className="h-4 w-4 text-brand-600" /> {q}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && <p className="border-t border-slate-100 px-5 py-4 text-sm text-slate-600">{a}</p>}
    </div>
  );
}

/* --------------------------- Plan recommendation wizard --------------------------- */

const ORG_TYPES = ["Community pool / HOA", "Swim club", "Summer camp", "School / university", "Municipality / district", "Private aquatics center"];
const MODULES = ["Scheduling", "Time clock", "Certifications", "Swim lessons", "Members", "Payroll export", "Inspections", "Documents"];

function PlanWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [orgType, setOrgType] = useState(ORG_TYPES[0]);
  const [facilities, setFacilities] = useState(1);
  const [pools, setPools] = useState(2);
  const [staff, setStaff] = useState(20);
  const [modules, setModules] = useState<string[]>(["Scheduling", "Time clock"]);
  const [setupTier, setSetupTier] = useState<string>("starter");

  const customNeeds = orgType.includes("Municipality") || modules.includes("Inspections");
  const tier = useMemo(() => recommendPlan({ facilities, staff, customNeeds }), [facilities, staff, customNeeds]);
  const plan = getPlan(tier);

  const steps = ["Organization", "Pool size", "Facilities", "Bodies of water", "Active staff", "Modules", "Setup", "Result"];

  const toggleModule = (m: string) =>
    setModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="card relative z-10 my-8 w-full max-w-lg overflow-hidden shadow-lift">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Plan recommendation</h2>
            <p className="text-xs text-slate-400">Step {step + 1} of {steps.length} · {steps[step]}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-6 py-6">
          <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>

          {step === 0 && (
            <Choices label="What type of organization?" options={ORG_TYPES} value={orgType} onChange={setOrgType} />
          )}
          {step === 1 && (
            <Choices label="How would you describe your size?" options={["Small — single seasonal pool", "Medium — multi-program facility", "Large — multi-site / municipal"]}
              value={["Small — single seasonal pool", "Medium — multi-program facility", "Large — multi-site / municipal"][["small", "medium", "big"].indexOf(tier)]}
              onChange={(v) => { if (v.startsWith("Small")) { setFacilities(1); setStaff(20); } else if (v.startsWith("Medium")) { setFacilities(2); setStaff(60); } else { setFacilities(5); setStaff(140); } }} />
          )}
          {step === 2 && <NumberField label="How many facilities?" value={facilities} setValue={setFacilities} min={1} max={20} />}
          {step === 3 && <NumberField label="How many pools / bodies of water?" value={pools} setValue={setPools} min={1} max={40} />}
          {step === 4 && <NumberField label="How many active staff?" value={staff} setValue={setStaff} min={1} max={500} step={5} />}
          {step === 5 && (
            <div>
              <p className="label">Which modules do you need?</p>
              <div className="flex flex-wrap gap-2">
                {MODULES.map((m) => (
                  <button key={m} onClick={() => toggleModule(m)}
                    className={cn("chip border transition-colors", modules.includes(m) ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
                    {modules.includes(m) && <Check className="h-3 w-3" />} {m}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 6 && (
            <Choices label="Which setup package?" options={SETUP_PACKAGES.map((s) => `${s.name} · ${s.priceLabel}`)}
              value={SETUP_PACKAGES.map((s) => `${s.name} · ${s.priceLabel}`)[["starter", "guided", "premium"].indexOf(setupTier)]}
              onChange={(v) => setSetupTier(SETUP_PACKAGES.find((s) => v.startsWith(s.name))?.tier ?? "starter")} />
          )}
          {step === 7 && (
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Sparkles className="h-7 w-7" /></span>
              <p className="mt-4 text-sm text-slate-500">We recommend</p>
              <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{plan.tagline}</p>
              <div className="mt-3 inline-flex flex-wrap justify-center gap-2 text-xs text-slate-500">
                <span className="chip bg-slate-100">{facilities} facilities</span>
                <span className="chip bg-slate-100">{pools} pools</span>
                <span className="chip bg-slate-100">{staff} staff</span>
                <span className="chip bg-slate-100">{getSetupName(setupTier)}</span>
              </div>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                {plan.cta === "quote"
                  ? <Link href="/quote" className="btn-primary justify-center">Request a quote <ArrowRight className="h-4 w-4" /></Link>
                  : <Link href="/login" className="btn-primary justify-center">Create organization <ArrowRight className="h-4 w-4" /></Link>}
                <Link href="/quote" className="btn-secondary justify-center">Talk to sales</Link>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn-ghost disabled:opacity-40">Back</button>
          {step < steps.length - 1
            ? <button onClick={() => setStep((s) => s + 1)} className="btn-primary">Next <ArrowRight className="h-4 w-4" /></button>
            : <button onClick={onClose} className="btn-secondary">Close</button>}
        </div>
      </div>
    </div>
  );
}

function getSetupName(tier: string): string {
  return SETUP_PACKAGES.find((s) => s.tier === tier)?.name ?? "Starter Setup";
}

function Choices({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="space-y-2">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)}
            className={cn("flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors",
              value === o ? "border-brand-400 bg-brand-50/60 text-slate-900" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>
            {o}
            {value === o && <Check className="h-4 w-4 text-brand-600" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberField({ label, value, setValue, min, max, step = 1 }: { label: string; value: number; setValue: (n: number) => void; min: number; max: number; step?: number }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-center gap-3">
        <button onClick={() => setValue(Math.max(min, value - step))} className="btn-secondary h-10 w-10 justify-center text-lg">–</button>
        <span className="w-16 text-center text-2xl font-bold text-slate-900">{value}</span>
        <button onClick={() => setValue(Math.min(max, value + step))} className="btn-secondary h-10 w-10 justify-center text-lg">+</button>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => setValue(Number(e.target.value))} className="mt-4 w-full accent-brand-600" />
    </div>
  );
}
