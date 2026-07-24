import { cn } from "@/lib/cn";
import type { Intent } from "@/lib/status";

const BAR: Record<Intent, string> = {
  success: "bg-emerald-600", warning: "bg-amber-600", danger: "bg-rose-600",
  info: "bg-sky-600", neutral: "bg-slate-400", brand: "bg-brand-600",
};

export function ProgressBar({
  value, intent, showLabel = false, className, size = "md",
}: {
  value: number; // 0-100
  intent?: Intent;
  showLabel?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const v = Math.max(0, Math.min(100, value));
  const auto: Intent = v >= 100 ? "success" : v >= 60 ? "brand" : v >= 30 ? "warning" : "danger";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("w-full overflow-hidden rounded-full bg-slate-200", size === "sm" ? "h-1.5" : "h-2")}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", BAR[intent ?? auto])}
          style={{ width: `${v}%` }}
        />
      </div>
      {showLabel && <span className="w-9 shrink-0 text-right text-xs font-semibold text-slate-500">{Math.round(v)}%</span>}
    </div>
  );
}
