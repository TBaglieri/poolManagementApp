import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The Readiness band — the dashboard's signature element and the manager's
 * three-second glance: is the pool COVERED, COMPLIANT, and SAFE today?
 *
 * Deliberately restrained (no skeuomorphic "water" decoration): the distinctiveness
 * is the reduction from a dozen equal-weight KPI cards to three real questions, set
 * with a strict type hierarchy (eyebrow → large tabular metric → caption → one verb
 * link) and a thin status rail. Status color is semantic (ok/warn/danger); the
 * tenant accent appears exactly once, as the section's eyebrow rule.
 */
export type SegState = "ok" | "warn" | "danger" | "neutral";

export interface ReadinessSegment {
  label: string;
  /** The headline value a manager scans, e.g. "92%", "All clear", "—". */
  value: string;
  /** One line of context under the value. */
  detail: string;
  state: SegState;
  /** Optional 0–100 level meter (used by Coverage); omit for the others. */
  meter?: number | null;
  href: string;
  /** The verb link — active voice, names what the manager will do. */
  cta: string;
}

const RAIL: Record<SegState, string> = {
  ok: "bg-emerald-600",
  warn: "bg-amber-600",
  danger: "bg-rose-600",
  neutral: "bg-slate-300 dark:bg-slate-600",
};
const VALUE_TONE: Record<SegState, string> = {
  ok: "text-slate-900 dark:text-slate-50",
  warn: "text-amber-700 dark:text-amber-300",
  danger: "text-rose-700 dark:text-rose-300",
  neutral: "text-slate-400 dark:text-slate-500",
};

function Meter({ value, state }: { value: number; state: SegState }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
      <div className={cn("h-full rounded-full transition-[width] duration-500", RAIL[state])} style={{ width: `${v}%` }} />
    </div>
  );
}

export function ReadinessBand({ segments, asOf }: { segments: ReadinessSegment[]; asOf: string }) {
  return (
    <section className="card overflow-hidden" aria-label="Readiness today">
      <header className="flex items-center justify-between gap-3 px-5 pt-4">
        <div>
          <p className="eyebrow">Readiness</p>
          {/* The one place the tenant accent is spent on this screen. */}
          <span className="mt-1 block h-0.5 w-6 rounded-full bg-accent-500" aria-hidden />
        </div>
        <p className="caption tnum">as of {asOf} · today</p>
      </header>

      <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-slate-800">
        {segments.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group relative flex flex-col px-5 py-4 outline-none transition-colors hover:bg-slate-50/70 focus-visible:bg-slate-50 dark:hover:bg-slate-800/40 dark:focus-visible:bg-slate-800/40"
          >
            <span className={cn("absolute left-0 top-4 h-8 w-0.5 rounded-full", RAIL[s.state])} aria-hidden />
            <p className="eyebrow">{s.label}</p>
            <p className={cn("metric mt-1.5", VALUE_TONE[s.state])}>{s.value}</p>
            <p className="caption mt-1">{s.detail}</p>
            {typeof s.meter === "number" && <Meter value={s.meter} state={s.state} />}
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
              {s.cta}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
