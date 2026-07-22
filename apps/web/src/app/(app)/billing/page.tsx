"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CreditCard, FileText, Landmark, ClipboardSignature, Download,
  ArrowRight, Sparkles, AlertTriangle,
} from "lucide-react";
import {
  SUBSCRIPTION_PLANS, getPlan, formatCurrency, formatDate, isoOffset, organization,
  BILLING_STATUS_LABELS, type PlanTier, type BillingStatus, type MockInvoice,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/tabs";
import { PAYMENT_OPTIONS, createCheckoutSession, openCustomerPortal, isStripeConfigured } from "@/lib/stripe";
import { cn } from "@/lib/cn";

const PAY_ICON = { CreditCard, FileText, Landmark, ClipboardSignature };

const STATUS_INTENT: Record<BillingStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  trial: "info", active: "success", past_due: "danger", canceled: "neutral", quote_required: "warning",
};

// Demo: org is on the Medium plan, active.
const CURRENT_TIER: PlanTier = "medium";
const CURRENT_STATUS: BillingStatus = "active";

const INVOICES: MockInvoice[] = [
  { id: "in_1", number: "POP-2026-0006", date: isoOffset(-2), amount: 149, status: "paid", plan: "Medium Pool — Monthly" },
  { id: "in_2", number: "POP-2026-0005", date: isoOffset(-32), amount: 149, status: "paid", plan: "Medium Pool — Monthly" },
  { id: "in_3", number: "POP-2026-0004", date: isoOffset(-62), amount: 149, status: "paid", plan: "Medium Pool — Monthly" },
  { id: "in_4", number: "POP-2026-0003", date: isoOffset(-92), amount: 49, status: "paid", plan: "Small Pool — Monthly" },
];

export default function BillingPage() {
  const { can } = useAccess();
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [toast, setToast] = useState<string | null>(null);

  if (!can("settings.manage")) {
    return <AccessRestricted message="Billing is limited to organization admins and the pool director." />;
  }

  const plan = getPlan(CURRENT_TIER);
  const price = cycle === "annual" ? plan.annual : plan.monthly;

  const handleCheckout = async (tier: PlanTier) => {
    const res = await createCheckoutSession(tier, cycle);
    setToast(res.message);
  };
  const handlePortal = async () => {
    const res = await openCustomerPortal();
    setToast(res.message);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Subscription"
        subtitle={`${organization.name} · manage your plan, payment method, and invoices`}
        actions={<Link href="/pricing" className="btn-secondary"><Sparkles className="h-4 w-4" /> Compare plans</Link>}
      />

      {!isStripeConfigured() && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Demo mode — Stripe is not configured, so no real charges are made. See <code className="mx-1">STRIPE_SETUP.md</code> to enable live billing.
        </div>
      )}

      {toast && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="font-semibold text-brand-700">Dismiss</button>
        </div>
      )}

      {/* Current plan + status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title="Current plan">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <Badge intent={STATUS_INTENT[CURRENT_STATUS]}>{BILLING_STATUS_LABELS[CURRENT_STATUS]}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="chip bg-slate-100">{plan.limits.facilities}</span>
                <span className="chip bg-slate-100">{plan.limits.pools}</span>
                <span className="chip bg-slate-100">{plan.limits.activeStaff}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(plan.monthly ?? 0)}<span className="text-sm font-medium text-slate-400">/mo</span></p>
              <p className="text-xs text-slate-400">Next invoice {formatDate(isoOffset(28))}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={handlePortal} icon="ExternalLink">Manage in customer portal</Button>
            <Link href="/settings/subscription" className="btn-secondary">Change plan</Link>
            <Button variant="ghost" onClick={() => setToast("Cancellation flow is a placeholder in this demo.")}>Cancel subscription</Button>
          </div>
        </SectionCard>

        <SectionCard title="Payment method">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-navy-950 text-white"><CreditCard className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-semibold text-slate-800">•••• •••• •••• 4242</p>
              <p className="text-xs text-slate-400">Visa · expires 08/29 (demo)</p>
            </div>
          </div>
          <Button variant="secondary" className="mt-3 w-full justify-center" onClick={handlePortal} icon="CreditCard">Update card</Button>
          <p className="mt-2 text-xs text-slate-400">Cards are handled by Stripe — PoolOps never stores card numbers.</p>
        </SectionCard>
      </div>

      {/* Upgrade / change plan */}
      <SectionCard
        title="Change your plan"
        subtitle="Upgrade or downgrade at any time"
        actions={<SegmentedControl options={[{ value: "monthly", label: "Monthly" }, { value: "annual", label: "Annual" }]} value={cycle} onChange={(v) => setCycle(v as "monthly" | "annual")} />}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((p) => {
            const isCurrent = p.tier === CURRENT_TIER;
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
                <p className="text-xs text-slate-400">{p.bestFor}</p>
                {isCurrent ? (
                  <Button variant="secondary" disabled className="mt-4 w-full justify-center">Your plan</Button>
                ) : p.cta === "quote" ? (
                  <Link href="/quote" className="btn-secondary mt-4 w-full justify-center">Request quote <ArrowRight className="h-4 w-4" /></Link>
                ) : (
                  <Button className="mt-4 w-full justify-center" onClick={() => handleCheckout(p.tier)}>
                    {SUBSCRIPTION_PLANS.findIndex((x) => x.tier === p.tier) > SUBSCRIPTION_PLANS.findIndex((x) => x.tier === CURRENT_TIER) ? "Upgrade" : "Switch"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Payment options */}
      <SectionCard title="Payment options" subtitle="Flexible billing for clubs and municipalities">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PAYMENT_OPTIONS.map((o) => {
            const Icon = PAY_ICON[o.icon as keyof typeof PAY_ICON];
            return (
              <div key={o.key} className="rounded-xl border border-slate-200 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Icon className="h-4 w-4" /></span>
                <p className="mt-3 text-sm font-semibold text-slate-800">{o.label}</p>
                <p className="mt-1 text-xs text-slate-500">{o.desc}</p>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Invoices */}
      <SectionCard title="Invoice history" subtitle="Mock invoices (demo)">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {INVOICES.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-3 py-2.5 font-medium text-slate-700">{inv.number}</td>
                  <td className="px-3 py-2.5 text-slate-500">{formatDate(inv.date)}</td>
                  <td className="px-3 py-2.5 text-slate-500">{inv.plan}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-700">{formatCurrency(inv.amount)}</td>
                  <td className="px-3 py-2.5 text-center"><Badge intent={inv.status === "paid" ? "success" : inv.status === "open" ? "warning" : "neutral"}>{inv.status === "paid" ? "Paid" : inv.status === "open" ? "Open" : "Void"}</Badge></td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => setToast(`Invoice ${inv.number} PDF download is a placeholder in this demo.`)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800">
                      <Download className="h-3.5 w-3.5" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
