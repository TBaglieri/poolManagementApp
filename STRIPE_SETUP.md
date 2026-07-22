# Stripe Setup — PoolOps Pro (placeholder)

PoolOps Pro is wired for **Stripe** as the future payment provider. This demo does **not** process real payments — the billing UI uses placeholder functions so nothing pretends a charge succeeded.

> ⚠️ Never commit Stripe secret keys. The secret key and webhook secret are **server-only**.

## Environment variables

Add to `apps/web/.env.local` (see `apps/web/.env.example`):

```bash
# Server-only (never exposed to the browser)
STRIPE_SECRET_KEY=sk_live_or_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Safe to expose to the browser
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_xxx
```

When `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is unset, the billing page shows a "demo mode — no real charges" banner (`isStripeConfigured()` in `apps/web/src/lib/stripe.ts`).

## Placeholder functions (today)

`apps/web/src/lib/stripe.ts`:

- `createCheckoutSession(plan, cycle)` — returns a placeholder result; would redirect to Stripe Checkout in production.
- `openCustomerPortal()` — placeholder; would open the Stripe billing portal.
- `isStripeConfigured()` — whether the publishable key is present.
- `PAYMENT_OPTIONS` — card / invoice-check / ACH-EFT / manual-quote UI options.

The Billing page (`/billing`) and Subscription page (`/settings/subscription`) call these and surface the placeholder messages as toasts.

## Production wiring (future)

1. **Install the SDK:** `npm i stripe` (server) — the browser uses `@stripe/stripe-js` if you build a custom Elements flow; Checkout/Portal redirects need only the publishable key.
2. **Create products & prices** in the Stripe dashboard for Small ($49/mo, $529/yr) and Medium ($149/mo, $1,609/yr). Big Pool is custom-quote.
3. **Checkout route** — `app/api/stripe/checkout/route.ts` (server):
   ```ts
   import Stripe from "stripe";
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
   // POST { priceId } -> stripe.checkout.sessions.create({ mode: "subscription", line_items, success_url, cancel_url })
   ```
4. **Customer portal route** — `app/api/stripe/portal/route.ts` (server) → `stripe.billingPortal.sessions.create(...)`.
5. **Webhook route** — `app/api/stripe/webhook/route.ts`:
   - Verify the signature with `STRIPE_WEBHOOK_SECRET`.
   - Handle `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.paid/payment_failed`.
   - Update `organization_subscriptions` and `invoices` via the **service-role** admin client (`packages/supabase/src/admin.ts`).
6. **Billing status** maps to the UI badges: `trial`, `active`, `past_due`, `canceled`, `quote_required`.

## Payment options

| Option                 | Use case                         | Status        |
|------------------------|----------------------------------|---------------|
| Credit / debit card    | Most customers                   | Stripe (future) |
| Invoice / check        | Municipalities & districts       | Manual        |
| ACH / EFT bank transfer| Larger accounts                  | Stripe ACH (future) |
| Manual quote / PO      | Big Pool / Enterprise            | Quote workflow |

## Security

- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` live only in server env / hosting secrets — never in client code or git.
- Always verify webhook signatures.
- Reconcile subscription state from webhooks, not from client redirects.
- Store the Stripe customer/subscription IDs on `organization_subscriptions`, never card data.
