/**
 * Stripe PLACEHOLDER helpers.
 *
 * This is a demonstration product — NO real payments are processed. These
 * functions describe the shape of a future Stripe integration so the billing UI
 * can be wired up without pretending a charge succeeded.
 *
 * Production wiring (see STRIPE_SETUP.md):
 *   • createCheckoutSession  → POST /api/stripe/checkout  → stripe.checkout.sessions.create
 *   • openCustomerPortal      → POST /api/stripe/portal    → stripe.billingPortal.sessions.create
 * Both must run SERVER-SIDE with STRIPE_SECRET_KEY (never in the browser).
 */
import type { PlanTier } from "@poolops/shared";

export interface PlaceholderResult {
  ok: false;
  placeholder: true;
  message: string;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

/** Placeholder — would redirect to a Stripe Checkout session in production. */
export async function createCheckoutSession(plan: PlanTier, cycle: "monthly" | "annual"): Promise<PlaceholderResult> {
  return {
    ok: false,
    placeholder: true,
    message: `Stripe Checkout is not configured in this demo. In production this would open a secure ${cycle} checkout for the ${plan} plan.`,
  };
}

/** Placeholder — would open the Stripe billing portal in production. */
export async function openCustomerPortal(): Promise<PlaceholderResult> {
  return {
    ok: false,
    placeholder: true,
    message: "The Stripe customer portal is not configured in this demo. In production this would let you manage cards, invoices, and cancellations.",
  };
}

export const PAYMENT_OPTIONS = [
  { key: "card", label: "Credit / debit card", desc: "Processed securely via Stripe (placeholder).", icon: "CreditCard", available: true },
  { key: "invoice", label: "Invoice / check", desc: "Net-30 invoicing for municipalities & districts.", icon: "FileText", available: true },
  { key: "ach", label: "ACH / EFT bank transfer", desc: "Direct bank transfer for larger accounts.", icon: "Landmark", available: true },
  { key: "quote", label: "Manual quote / PO", desc: "Custom procurement workflow for Big Pool.", icon: "ClipboardSignature", available: true },
] as const;
