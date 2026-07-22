"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { recommendPlan, getPlan, SETUP_PACKAGES } from "@poolops/shared";
import { repos } from "@/lib/repos";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/marketing-chrome";

const ORG_TYPES = ["Community pool / HOA", "Swim club", "Summer camp", "School / university", "Municipality / district", "Private aquatics center"];
const MODULES = ["Scheduling", "Time clock", "Certifications", "Swim lessons", "Members", "Payroll export", "Inspections", "Document library"];

export default function QuotePage() {
  const [submitted, setSubmitted] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [org, setOrg] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [orgType, setOrgType] = useState(ORG_TYPES[0]);
  const [facilities, setFacilities] = useState(2);
  const [pools, setPools] = useState(4);
  const [staff, setStaff] = useState(50);
  const [modules, setModules] = useState<string[]>(["Scheduling", "Time clock"]);
  const [message, setMessage] = useState("");

  const customNeeds = orgType.includes("Municipality") || modules.includes("Inspections");
  const tier = useMemo(() => recommendPlan({ facilities, staff, customNeeds }), [facilities, staff, customNeeds]);
  const plan = getPlan(tier);

  const toggleModule = (m: string) =>
    setModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Saves to Supabase (quote_requests) in supabase mode; mock no-op otherwise.
    const res = await repos.quoteRequests.create({
      organizationName: org, contactName: contact, email, orgType,
      facilityCount: facilities, poolCount: pools, staffCount: staff,
      recommendedPlan: tier, modules, message,
    });
    if (res.source === "supabase" && res.ok) setSaveNote("Saved to your Supabase database (quote_requests).");
    else if (res.source === "supabase" && !res.ok) setSaveNote(`Saved locally — Supabase note: ${res.error}`);
    else setSaveNote(null);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-full bg-white">
      <MarketingHeader />
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        {submitted ? (
          <div className="card mx-auto max-w-xl p-10 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></span>
            <h1 className="mt-5 text-2xl font-bold text-slate-900">Quote request received</h1>
            <p className="mx-auto mt-2 max-w-md text-slate-600">
              Thanks {contact || "there"}! Based on {facilities} facilities, {pools} pools, and {staff} staff, we'd recommend the
              <strong> {plan.name}</strong> plan. Our team will follow up at {email || "your email"} within one business day.
            </p>
            <p className="mt-2 text-xs text-slate-400">{saveNote ?? "Demo mode — no email was sent. Set NEXT_PUBLIC_DATA_MODE=supabase to save to the quote_requests table."}</p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <Link href="/login" className="btn-primary justify-center">Explore the demo <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/pricing" className="btn-secondary justify-center">Back to pricing</Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Request a quote</h1>
              <p className="mt-2 text-slate-600">Tell us about your operation and we'll tailor a plan — including invoice, check, or ACH billing for municipalities.</p>

              <form onSubmit={submit} className="mt-8 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Organization name</label>
                    <input required value={org} onChange={(e) => setOrg(e.target.value)} className="input" placeholder="Cedar Falls Parks & Rec" />
                  </div>
                  <div>
                    <label className="label">Organization type</label>
                    <select value={orgType} onChange={(e) => setOrgType(e.target.value)} className="input cursor-pointer">
                      {ORG_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Contact name</label>
                    <input required value={contact} onChange={(e) => setContact(e.target.value)} className="input" placeholder="Jordan Smith" />
                  </div>
                  <div>
                    <label className="label">Work email</label>
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@city.gov" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <NumField label="Facilities" value={facilities} setValue={setFacilities} />
                  <NumField label="Bodies of water" value={pools} setValue={setPools} />
                  <NumField label="Active staff" value={staff} setValue={setStaff} step={5} />
                </div>

                <div>
                  <label className="label">Modules you're interested in</label>
                  <div className="flex flex-wrap gap-2">
                    {MODULES.map((m) => (
                      <button type="button" key={m} onClick={() => toggleModule(m)}
                        className={`chip border transition-colors ${modules.includes(m) ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Anything else?</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="input resize-y" placeholder="Tell us about your season, procurement process, or timeline…" />
                </div>

                <button type="submit" className="btn-primary px-6 py-2.5">Send quote request <ArrowRight className="h-4 w-4" /></button>
              </form>
            </div>

            {/* Live recommendation sidebar */}
            <aside className="h-fit lg:sticky lg:top-24">
              <div className="card overflow-hidden">
                <div className="bg-gradient-to-br from-brand-600 to-cyan-600 px-5 py-5 text-white">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/80"><Sparkles className="h-3.5 w-3.5" /> Live recommendation</p>
                  <p className="mt-2 text-2xl font-bold">{plan.name}</p>
                  <p className="mt-1 text-sm text-white/80">{plan.bestFor}</p>
                </div>
                <div className="p-5 text-sm">
                  <p className="text-slate-600">{plan.tagline}</p>
                  <ul className="mt-4 space-y-2 text-slate-600">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {plan.limits.facilities}</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {plan.limits.activeStaff}</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {SETUP_PACKAGES.find((s) => s.bestForTier === tier)?.name}</li>
                  </ul>
                  <p className="mt-4 text-xs text-slate-400">Updates as you adjust facilities & staff.</p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>
      <MarketingFooter />
    </div>
  );
}

function NumField({ label, value, setValue, step = 1 }: { label: string; value: number; setValue: (n: number) => void; step?: number }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" min={0} step={step} value={value} onChange={(e) => setValue(Number(e.target.value))} className="input" />
    </div>
  );
}
