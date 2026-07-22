import Link from "next/link";

/**
 * Shown when a request resolves to no tenant (e.g. an unrecognized facility path
 * on a multi-tenant, no-default deployment). Neutral and never a crash/blank.
 */
export default function UnknownFacilityPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Facility not found</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">We couldn't find that pool</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          The address you used doesn't match a known facility. Check the link your
          administrator sent you, or head to the sign-in page.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/login" className="btn-primary">Go to sign in</Link>
          <Link href="/" className="btn-secondary">Home</Link>
        </div>
      </div>
    </div>
  );
}
