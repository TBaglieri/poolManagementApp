/**
 * PoolOps Pro — pricing, setup packages, and billing reference data.
 *
 * All pricing is original placeholder pricing for this demonstration product.
 * It is intentionally NOT copied from any other aquatics platform. Values are
 * marketing placeholders — real billing is handled by Stripe (see STRIPE_SETUP.md).
 */
import type { RoleSlug } from "../types";

export type PlanTier = "small" | "medium" | "big";
export type BillingStatus = "trial" | "active" | "past_due" | "canceled" | "quote_required";

export interface PlanLimits {
  facilities: string;
  pools: string;
  activeStaff: string;
}

export interface SubscriptionPlan {
  tier: PlanTier;
  name: string;
  tagline: string;
  bestFor: string;
  monthly: number | null; // null = custom quote
  annual: number | null;
  startsAt?: number; // for custom-quote plans, "starts at" monthly
  popular?: boolean;
  limits: PlanLimits;
  features: string[];
  /** Higher tiers include everything in the tier below. */
  includesPrevious?: PlanTier;
  cta: "start" | "quote";
  accent: "cyan" | "navy" | "violet";
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: "small",
    name: "Small Pool",
    tagline: "For small community pools, HOAs, swim clubs, and single-facility seasonal pools.",
    bestFor: "Single seasonal pool",
    monthly: 49,
    annual: 529,
    accent: "cyan",
    cta: "start",
    limits: { facilities: "1 facility", pools: "Up to 2 bodies of water", activeStaff: "Up to 25 active staff" },
    features: [
      "Core auto scheduling & open shifts",
      "Time clock & missed-punch alerts",
      "All Team messaging & announcements",
      "Basic onboarding",
      "Chemical logs with range checks",
      "Opening / closing checklists",
      "Maintenance issue board",
      "Basic operational reports",
    ],
  },
  {
    tier: "medium",
    name: "Medium Pool",
    tagline: "For larger community pools, swim clubs, camps, and multi-program facilities.",
    bestFor: "Multi-program facility",
    monthly: 149,
    annual: 1609,
    popular: true,
    includesPrevious: "small",
    accent: "navy",
    cta: "start",
    limits: { facilities: "Up to 3 facilities", pools: "Up to 6 bodies of water", activeStaff: "Up to 100 active staff" },
    features: [
      "Advanced scheduling & rotation fairness",
      "Certification tracking & expiry alerts",
      "Swim lessons & class rosters",
      "Member & household management",
      "Payroll export (CSV / providers)",
      "Advanced onboarding flows",
      "Document library with access control",
      "Expanded reporting & analytics",
    ],
  },
  {
    tier: "big",
    name: "Big Pool / Enterprise Aquatics",
    tagline: "For municipalities, school districts, multi-site aquatic centers, and large camps.",
    bestFor: "Multi-site & municipal",
    monthly: null,
    annual: null,
    startsAt: 299,
    includesPrevious: "medium",
    accent: "violet",
    cta: "quote",
    limits: { facilities: "Custom / unlimited facilities", pools: "Custom / unlimited pools", activeStaff: "100+ active staff" },
    features: [
      "Multi-site controls & dashboards",
      "Advanced role & permission management",
      "Audit logs for sensitive actions",
      "Inspection & compliance exports",
      "Custom onboarding & document flows",
      "Custom reporting",
      "Priority support (placeholder)",
      "Custom quote & procurement workflow",
    ],
  },
];

export function getPlan(tier: PlanTier): SubscriptionPlan {
  return SUBSCRIPTION_PLANS.find((p) => p.tier === tier)!;
}

/** Feature comparison rows for the pricing table. */
export interface ComparisonRow {
  label: string;
  group: string;
  small: string | boolean;
  medium: string | boolean;
  big: string | boolean;
}

export const PLAN_COMPARISON: ComparisonRow[] = [
  { group: "Limits", label: "Facilities", small: "1", medium: "Up to 3", big: "Unlimited" },
  { group: "Limits", label: "Bodies of water", small: "2", medium: "6", big: "Unlimited" },
  { group: "Limits", label: "Active staff", small: "25", medium: "100", big: "100+" },
  { group: "Scheduling", label: "Auto schedule builder", small: true, medium: true, big: true },
  { group: "Scheduling", label: "Open shifts & trades", small: true, medium: true, big: true },
  { group: "Scheduling", label: "Rotation fairness & preferences", small: false, medium: true, big: true },
  { group: "Operations", label: "Chemical logs & checklists", small: true, medium: true, big: true },
  { group: "Operations", label: "Maintenance board", small: true, medium: true, big: true },
  { group: "Operations", label: "Inspections & compliance exports", small: false, medium: true, big: true },
  { group: "Team", label: "Time clock", small: true, medium: true, big: true },
  { group: "Team", label: "Certification tracking", small: false, medium: true, big: true },
  { group: "Team", label: "Payroll export", small: false, medium: true, big: true },
  { group: "Programs", label: "Swim lessons & classes", small: false, medium: true, big: true },
  { group: "Programs", label: "Members & households", small: false, medium: true, big: true },
  { group: "Programs", label: "Document library", small: false, medium: true, big: true },
  { group: "Governance", label: "Advanced role permissions", small: false, medium: false, big: true },
  { group: "Governance", label: "Audit logs", small: false, medium: false, big: true },
  { group: "Governance", label: "Multi-site controls", small: false, medium: false, big: true },
  { group: "Support", label: "Priority support", small: false, medium: false, big: true },
  { group: "Support", label: "Custom onboarding & migration", small: false, medium: false, big: true },
];

export type SetupTier = "starter" | "guided" | "premium";

export interface SetupPackage {
  tier: SetupTier;
  name: string;
  price: number | null; // null = custom quote
  priceLabel: string;
  bestForTier: PlanTier;
  summary: string;
  includes: string[];
}

export const SETUP_PACKAGES: SetupPackage[] = [
  {
    tier: "starter",
    name: "Starter Setup",
    price: 0,
    priceLabel: "$0 one-time",
    bestForTier: "small",
    summary: "Self-guided setup to get a single facility live this week.",
    includes: [
      "Self-guided setup wizard",
      "Staff CSV import (placeholder)",
      "Configure one facility",
      "Basic schedule template setup",
    ],
  },
  {
    tier: "guided",
    name: "Guided Setup",
    price: 299,
    priceLabel: "$299 one-time",
    bestForTier: "medium",
    summary: "Assisted onboarding for multi-facility operations.",
    includes: [
      "Assisted setup (placeholder)",
      "Multiple facility configuration",
      "Staff import & role setup",
      "Onboarding & chemical range setup",
    ],
  },
  {
    tier: "premium",
    name: "Premium Migration",
    price: null,
    priceLabel: "Custom quote",
    bestForTier: "big",
    summary: "White-glove migration for multi-site and municipal operations.",
    includes: [
      "Multi-site onboarding",
      "Historical records import (placeholder)",
      "Staff training (placeholder)",
      "Custom reports (placeholder)",
    ],
  },
];

export const PRICING_FAQ: { q: string; a: string }[] = [
  { q: "Can I switch plans later?", a: "Yes. You can upgrade or downgrade at any time from Settings → Subscription. Upgrades take effect immediately; downgrades apply at the next billing cycle." },
  { q: "Do you offer annual billing?", a: "Yes — annual billing saves roughly 10% versus paying monthly. Toggle monthly/annual on this page to compare." },
  { q: "How does billing work for municipalities?", a: "Big Pool / Enterprise customers can pay by invoice, check, or ACH/EFT in addition to card. Request a quote and we'll tailor a procurement-friendly workflow." },
  { q: "Is there a free trial?", a: "Every plan starts with a trial in demo mode — explore the full product with sample data before connecting billing." },
  { q: "What payment methods are supported?", a: "Card payments are processed through Stripe (placeholder in this demo). Invoice, check, and ACH/EFT options are available for larger accounts." },
];

/** Roles permitted to view & manage billing in the demo. */
export const BILLING_MANAGER_ROLES: RoleSlug[] = ["super_admin", "org_admin"];

export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  trial: "Trial",
  active: "Active",
  past_due: "Past Due",
  canceled: "Canceled",
  quote_required: "Quote Required",
};

export interface MockInvoice {
  id: string;
  date: string; // ISO
  amount: number;
  status: "paid" | "open" | "void";
  plan: string;
  number: string;
}

/** Plan recommendation from the wizard inputs. */
export function recommendPlan(input: {
  facilities: number;
  staff: number;
  customNeeds?: boolean;
}): PlanTier {
  if (input.customNeeds || input.facilities > 3 || input.staff > 100) return "big";
  if (input.facilities > 1 || input.staff > 25) return "medium";
  return "small";
}
