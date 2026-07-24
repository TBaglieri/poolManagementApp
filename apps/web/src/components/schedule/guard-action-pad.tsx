"use client";

import Link from "next/link";
import { useAccess } from "@/lib/access";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/**
 * The lifeguard's quick-action pad — big, thumb-reachable tiles for the handful of
 * things a guard does mid-shift, so their home is a focused tool, not the admin UI
 * with items removed. Each tile is permission-gated (only shows what the role can
 * do) and ≥44px for wet hands on a phone. See DESIGN.md §6.
 */
interface Action {
  label: string;
  href: string;
  icon: string;
  perms: string[];
}

const ACTIONS: Action[] = [
  { label: "Clock in", href: "/time-clock", icon: "Clock", perms: ["timeclock.self", "timeclock.manage"] },
  { label: "Log reading", href: "/chemicals", icon: "FlaskConical", perms: ["chemicals.log", "chemicals.view"] },
  { label: "Run checklist", href: "/checklists", icon: "ListChecks", perms: ["checklists.complete", "checklists.view"] },
  { label: "File report", href: "/shift-reports", icon: "FileText", perms: ["shiftreports.submit", "shiftreports.view"] },
];

export function GuardActionPad() {
  const { canAny } = useAccess();
  const shown = ACTIONS.filter((a) => canAny(a.perms as never));
  if (shown.length === 0) return null;

  return (
    <div>
      <p className="eyebrow mb-2.5">Quick actions</p>
      <div className={cn("grid gap-3", shown.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2")}>
        {shown.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="card card-hover flex min-h-[76px] flex-col items-start justify-between gap-2 p-4 active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
              <Icon name={a.icon} className="h-[18px] w-[18px]" />
            </span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
