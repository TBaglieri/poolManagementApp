"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, Users, ExternalLink } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";

/** Copyable text row with a copy-to-clipboard button. */
function CopyRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked — the field is selectable as a fallback */ }
  };
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="input flex-1 font-mono text-xs" />
        <button
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          title="Copy link"
        >
          {copied ? <><Check className="h-4 w-4 text-emerald-600" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/**
 * Admin "share this tenant" affordance. Produces the copyable, tenant-isolated
 * portal link (resolves straight into this tenant's login) and points to the
 * existing role-invite flow for secure, single-use, expiring staff invites — no
 * hand-built URLs, and a share link never grants access to another tenant.
 */
export function ShareLinks({ slug, displayName }: { slug: string; displayName: string }) {
  // Origin is only known in the browser; safe here since this is a client component.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const portalUrl = `${origin}/${slug}/login`;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard title="Pool portal link" subtitle={`Send this to bring people to the ${displayName} sign-in.`}>
        <div className="space-y-4">
          <CopyRow
            label="Share link (text or email)"
            value={portalUrl}
            hint="Opens this tenant's branded login. Tenant-isolated — it only ever resolves to this pool."
          />
          <p className="text-xs text-slate-400">
            Anyone with an account here can sign in from this link. It does not create accounts —
            use a role invite below to add staff.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Invite staff (role-scoped)" subtitle="Secure, single-use, expiring invites tied to a role.">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Role invites (e.g. a lifeguard) go through Users &amp; Access, which issues a
            one-time, expiring link and provisions the person's staff profile on
            acceptance — so their My Shifts and clock-in work immediately.
          </p>
          <Link href="/settings/users" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            <Users className="h-4 w-4" /> Open Users &amp; Access <ExternalLink className="h-3.5 w-3.5 opacity-80" />
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
