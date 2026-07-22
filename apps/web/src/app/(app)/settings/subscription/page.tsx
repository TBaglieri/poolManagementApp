"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, Sparkles, Users, Building2, Waves } from "lucide-react";
import {
  SUBSCRIPTION_PLANS, getPlan, formatCurrency, organization, staff as seedStaff, facilities,
  BILLING_STATUS_LABELS, type PlanTier,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/tabs";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/lib/cn";

const CURRENT: PlanTier = "medium";

export default function SubscriptionPage() {
  const { can } = useAccess();
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");

  if (!can("settings.manage")) return <AccessRestricted message="Subscription management is limited to admins." />;

  const plan = getPlan(CURRENT);
  const staffUsed = seedStaff.length;
  const staffLimit = 100;
  const facilitiesUsed = facilities.length;
  const facilitiesLimit = 3;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription"
        subtitle={`${organization.name} · usage and plan management`}
        actions={<Link href="/billing" className="btn-secondary">Billing & invoices <ArrowRight className="h-4 w-4" /></Link>}
      />

      {/* Current + usage */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard className="lg:col-span-1" title="Current plan">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
            <Badge intent="success">{BILLING_STATUS_LABELS.active}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>
          <p className="mt-4 text-2xl font-bold text-slate-900">{formatCurrency(plan.monthly ?? 0)}<span className="text-sm font-medium text-slate-400">/mo</span></p>
        </SectionCard>

        <SectionCard className="lg:col-span-2" title="Usage this billing period">
          <div className="space-y-4">
            <Usage icon={Users} label="Active staff" used={staffUsed} limit={staffLimit} />
            <Usage icon={Building2} label="Facilities" used={facilitiesUsed} limit={facilitiesLimit} />
            <Usage icon={Waves} label="Bodies of water" used={6} limit={6} />
          </div>
        </SectionCard>
      </div>

      {/* Change plan */}
      <SectionCard
        title="Change plan"
        actions={<SegmentedControl options={[{ value: "monthly", label: "Monthly" }, { value: "annual", label: "Annual" }]} value={cycle} onChange={(v) => setCycle(v as "monthly" | "annual")} />}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((p) => {
            const isCurrent = p.tier === CURRENT;
            const amount = cycle === "annual" ? p.annual : p.monthly;
            return (
              <div key={p.tier} className={cn("rounded-2xl border p-5", isCurrent ? "border-brand-400 bg-brand-50/40" : "border-slate-200")}>
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-900">{p.name}</h4>
                  {isCurrent && <Badge intent="brand">Current</Badge>}
                </div>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {amount == null ? "Custom" : <>{formatCurrency(cycle === "annual" ? Math.round((p.annual ?? 0) / 12) : (p.monthly ?? 0))}<span className="text-sm font-medium text-slate-400">/mo</span></>}
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                  {p.features.slice(0, 4).map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {f}</li>)}
                </ul>
                <div className="mt-4">
                  {isCurrent ? (
                    <Button variant="secondary" disabled className="w-full justify-center">Your plan</Button>
                  ) : p.cta === "quote" ? (
                    <Link href="/quote" className="btn-secondary w-full justify-center">Request quote</Link>
                  ) : (
                    <Link href="/billing" className="btn-primary w-full justify-center">Switch to {p.name.split(" ")[0]}</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400"><Sparkles className="h-3.5 w-3.5" /> Upgrades take effect immediately; downgrades apply next cycle.</p>
      </SectionCard>
    </div>
  );
}

function Usage({ icon: Icon, label, used, limit }: { icon: typeof Users; label: string; used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-slate-700"><Icon className="h-4 w-4 text-brand-500" /> {label}</span>
        <span className={cn("text-xs font-semibold", pct >= 90 ? "text-amber-600" : "text-slate-500")}>{used} / {limit}</span>
      </div>
      <ProgressBar value={pct} intent={pct >= 90 ? "warning" : "brand"} />
    </div>
  );
}
