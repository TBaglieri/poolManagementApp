"use client";

import { UserX } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Fail-loud state for a signed-in staff user whose auth account has no linked
 * staff_profiles row. Shown instead of silently-empty self-service screens (My
 * Shifts, clock-in, …) so the guard knows to contact their admin rather than
 * assuming they simply have no shifts. See AUDIT.md §4e.
 */
export function UnlinkedStaffNotice({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-amber-300 bg-amber-50 p-5 text-center dark:border-amber-500/40 dark:bg-amber-500/10", className)}>
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/20">
        <UserX className="h-6 w-6" />
      </span>
      <h2 className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">Your staff profile isn't set up yet</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        You're signed in, but your account isn't linked to a staff record, so we can't
        show your shifts or let you clock in. Please contact your administrator to finish setup.
      </p>
    </div>
  );
}
