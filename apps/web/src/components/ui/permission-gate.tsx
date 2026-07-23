"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { landingPathForRole, isDemoTenant, type PermissionKey } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useTenantConfig } from "@/lib/tenant/provider";

/** Render children only if the current role has any of the required permissions. */
export function PermissionGate({
  anyOf, fallback = null, children,
}: {
  anyOf: PermissionKey[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { canAny } = useAccess();
  if (anyOf.length === 0 || canAny(anyOf)) return <>{children}</>;
  return <>{fallback}</>;
}

/** Full-page "access restricted" state for routes the role cannot use. */
export function AccessRestricted({
  title = "Access restricted",
  message = "Your current role doesn't have permission to view this page.",
}: {
  title?: string;
  message?: string;
}) {
  const { role, roleMeta } = useAccess();
  const config = useTenantConfig();
  const demo = isDemoTenant(config);
  // Send them somewhere they CAN actually go — their role's landing page, never
  // back to a page they can't view.
  const home = landingPathForRole(role);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <Lock className="h-7 w-7" />
      </span>
      <h1 className="mt-5 text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {roleMeta && (
        <p className="mt-4 text-xs text-slate-400">
          Signed in as <span className="font-semibold text-slate-600 dark:text-slate-300">{roleMeta.name}</span>.
          {/* Role switching is a DEMO-only preview affordance — never suggested to real users. */}
          {demo && " Switch roles from the top bar to preview other access levels."}
        </p>
      )}
      <Link href={home} className="btn-primary mt-6">Go to my home</Link>
    </div>
  );
}
