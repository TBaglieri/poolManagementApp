"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ArrowLeft, Check, Building2, Waves, Users, Sparkles, Loader2, AlertCircle, CheckCircle2,
} from "lucide-react";
import { SUBSCRIPTION_PLANS, SETUP_PACKAGES, recommendPlan, type PlanTier } from "@poolops/shared";
import { useSession } from "@/lib/session";
import { repos, activeMode } from "@/lib/repos";
import { Logo } from "@/components/brand";
import { cn } from "@/lib/cn";

const ORG_TYPES = [
  { value: "community_pool", label: "HOA / Community pool" },
  { value: "swim_club", label: "Private swim club" },
  { value: "municipality", label: "Municipality" },
  { value: "school", label: "School / University" },
  { value: "camp", label: "Summer camp" },
  { value: "private_aquatics_center", label: "Commercial aquatics center" },
];
const POOL_TYPES = ["outdoor_competition", "indoor", "lap", "leisure", "wading", "splash_pad"];

const STEPS = ["Organization", "Plan", "Setup package", "Scale", "First facility", "Invite staff", "Finish"];

export function OrgSetupWizard() {
  const router = useRouter();
  const email = useSession((s) => s.email);
  const setRealOrg = useSession((s) => s.setRealOrg);

  const [step, setStep] = useState(0);
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState(ORG_TYPES[0].value);
  const [plan, setPlan] = useState<PlanTier>("small");
  const [setupPkg, setSetupPkg] = useState("starter");
  const [facilityCount, setFacilityCount] = useState(1);
  const [poolCount, setPoolCount] = useState(2);
  const [staffEstimate, setStaffEstimate] = useState(20);
  const [facName, setFacName] = useState("");
  const [facAddress, setFacAddress] = useState("");
  const [facHours, setFacHours] = useState("6:00 AM – 8:00 PM");
  const [facPoolType, setFacPoolType] = useState("outdoor_competition");
  const [facCapacity, setFacCapacity] = useState(200);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const recommended = recommendPlan({ facilities: facilityCount, staff: staffEstimate });

  const finish = async () => {
    setBusy(true); setError(null); setNote(null);
    const res = await repos.orgSetup.create({
      orgName: orgName || "My Aquatics Organization", orgType, plan, setupPackage: setupPkg,
      facilityCount, poolCount, staffEstimate,
      firstFacility: { name: facName || "Main Pool", address: facAddress, hours: facHours, poolType: facPoolType, capacity: facCapacity },
    });
    setBusy(false);
    if (res.source === "supabase" && !res.ok) {
      // Schema not applied / error: don't trap the user — set up locally and warn.
      setNote(`Saved locally. Supabase note: ${res.error}. Run supabase/schema.sql to persist your organization.`);
    }
    setRealOrg(orgName || "My Aquatics Organization", plan);
    setTimeout(() => router.push("/dashboard"), res.source === "supabase" && !res.ok ? 1400 : 200);
  };

  const canNext = step !== 0 || orgName.trim().length > 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-cyan-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo size="md" />
          <span className="text-sm text-slate-500">{email}</span>
        </div>

        <div className="card overflow-hidden shadow-lift">
          <div className="border-b border-slate-100 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Create your organization · Step {step + 1} of {STEPS.length}</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">{STEPS[step]}</h1>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
          </div>

          <div className="px-6 py-6">
            {step === 0 && (
              <div className="space-y-4">
                <Field label="Organization name" required>
                  <input className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Cedar Falls Parks & Rec" autoFocus />
                </Field>
                <Field label="Organization type">
                  <select className="input cursor-pointer" value={orgType} onChange={(e) => setOrgType(e.target.value)}>
                    {ORG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                {SUBSCRIPTION_PLANS.map((p) => (
                  <button key={p.tier} onClick={() => setPlan(p.tier)}
                    className={cn("flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-colors", plan === p.tier ? "border-brand-500 bg-brand-50/50" : "border-slate-200 hover:bg-slate-50")}>
                    <div>
                      <p className="font-semibold text-slate-900">{p.name} {recommended === p.tier && <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Recommended</span>}</p>
                      <p className="text-xs text-slate-500">{p.bestFor} · {p.monthly == null ? "Custom quote" : `$${p.monthly}/mo`}</p>
                    </div>
                    {plan === p.tier && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                {SETUP_PACKAGES.map((s) => (
                  <button key={s.tier} onClick={() => setSetupPkg(s.tier)}
                    className={cn("flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-colors", setupPkg === s.tier ? "border-brand-500 bg-brand-50/50" : "border-slate-200 hover:bg-slate-50")}>
                    <div>
                      <p className="font-semibold text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.priceLabel} · {s.summary}</p>
                    </div>
                    {setupPkg === s.tier && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <Counter icon={Building2} label="How many facilities?" value={facilityCount} setValue={setFacilityCount} min={1} max={20} />
                <Counter icon={Waves} label="Pools / bodies of water?" value={poolCount} setValue={setPoolCount} min={1} max={40} />
                <Counter icon={Users} label="Active staff (estimate)?" value={staffEstimate} setValue={setStaffEstimate} min={1} max={500} step={5} />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <Field label="Facility name" required><input className="input" value={facName} onChange={(e) => setFacName(e.target.value)} placeholder="Maplewood Community Pool" /></Field>
                <Field label="Address"><input className="input" value={facAddress} onChange={(e) => setFacAddress(e.target.value)} placeholder="412 Maplewood Dr" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Operating hours"><input className="input" value={facHours} onChange={(e) => setFacHours(e.target.value)} /></Field>
                  <Field label="Capacity"><input type="number" className="input" value={facCapacity} onChange={(e) => setFacCapacity(Number(e.target.value))} /></Field>
                </div>
                <Field label="Pool type">
                  <select className="input cursor-pointer" value={facPoolType} onChange={(e) => setFacPoolType(e.target.value)}>
                    {POOL_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </Field>
              </div>
            )}

            {step === 5 && (
              <div className="text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Users className="h-7 w-7" /></span>
                <p className="mt-4 text-sm text-slate-600">You can invite your team now or after setup from <strong>Settings → Users</strong> or the <strong>Staff</strong> page. We'll create their accounts by email and assign roles.</p>
                <p className="mt-2 text-xs text-slate-400">Invites are managed under Staff & Access — you stay in control of who can manage whom.</p>
              </div>
            )}

            {step === 6 && (
              <div className="text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Sparkles className="h-8 w-8" /></span>
                <h2 className="mt-4 text-lg font-bold text-slate-900">Ready to launch {orgName || "your organization"}</h2>
                <div className="mt-3 inline-flex flex-wrap justify-center gap-2 text-xs text-slate-500">
                  <span className="chip bg-slate-100">{SUBSCRIPTION_PLANS.find((p) => p.tier === plan)?.name}</span>
                  <span className="chip bg-slate-100">{facilityCount} facilities</span>
                  <span className="chip bg-slate-100">{staffEstimate} staff</span>
                  <span className="chip bg-slate-100">{SETUP_PACKAGES.find((s) => s.tier === setupPkg)?.name}</span>
                </div>
                <p className="mt-3 text-xs text-slate-400">{activeMode() === "supabase" ? "Your organization, membership (you as Org Admin), and first facility will be created in Supabase." : "Mock mode — your organization is set up locally."}</p>
                {error && <p className="mt-3 flex items-center justify-center gap-1 text-sm text-rose-600"><AlertCircle className="h-4 w-4" /> {error}</p>}
                {note && <p className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700"><CheckCircle2 className="h-4 w-4" /> {note}</p>}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy} className="btn-ghost disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Back</button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => canNext && setStep((s) => s + 1)} disabled={!canNext} className="btn-primary disabled:opacity-50">Next <ArrowRight className="h-4 w-4" /></button>
            ) : (
              <button onClick={finish} disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Create organization
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-rose-500"> *</span>}</label>
      {children}
    </div>
  );
}

function Counter({ icon: Icon, label, value, setValue, min, max, step = 1 }: { icon: typeof Users; label: string; value: number; setValue: (n: number) => void; min: number; max: number; step?: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
      <span className="flex items-center gap-2 text-sm font-medium text-slate-700"><Icon className="h-4 w-4 text-brand-500" /> {label}</span>
      <span className="flex items-center gap-2">
        <button onClick={() => setValue(Math.max(min, value - step))} className="btn-secondary h-8 w-8 justify-center">–</button>
        <span className="w-10 text-center font-bold text-slate-900">{value}</span>
        <button onClick={() => setValue(Math.min(max, value + step))} className="btn-secondary h-8 w-8 justify-center">+</button>
      </span>
    </div>
  );
}
