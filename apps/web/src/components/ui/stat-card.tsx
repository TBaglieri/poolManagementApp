import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { INTENT_CLASSES, type Intent } from "@/lib/status";

export function StatCard({
  label, value, icon, intent = "brand", delta, deltaDirection, hint, className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: string;
  intent?: Intent;
  delta?: string;
  deltaDirection?: "up" | "down";
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("card card-hover p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        {icon && (
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", INTENT_CLASSES[intent])}>
            <Icon name={icon} className="h-5 w-5" />
          </span>
        )}
      </div>
      {(delta || hint) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {delta && (
            <span className={cn(
              "inline-flex items-center gap-0.5 font-semibold",
              deltaDirection === "down" ? "text-rose-600" : "text-emerald-600",
            )}>
              {deltaDirection === "down" ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
              {delta}
            </span>
          )}
          {hint && <span className="text-slate-400">{hint}</span>}
        </div>
      )}
    </div>
  );
}
