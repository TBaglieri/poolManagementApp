import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { type Intent } from "@/lib/status";

const STYLES: Record<Intent, { wrap: string; icon: string; defaultIcon: string }> = {
  success: { wrap: "border-emerald-200 bg-emerald-50", icon: "text-emerald-600", defaultIcon: "CheckCircle2" },
  warning: { wrap: "border-amber-200 bg-amber-50", icon: "text-amber-600", defaultIcon: "AlertTriangle" },
  danger: { wrap: "border-rose-200 bg-rose-50", icon: "text-rose-600", defaultIcon: "AlertOctagon" },
  info: { wrap: "border-sky-200 bg-sky-50", icon: "text-sky-600", defaultIcon: "Info" },
  neutral: { wrap: "border-slate-200 bg-slate-50", icon: "text-slate-500", defaultIcon: "Info" },
  brand: { wrap: "border-brand-200 bg-brand-50", icon: "text-brand-600", defaultIcon: "Sparkles" },
};

export function AlertCard({
  intent = "info", title, children, icon, action, className,
}: {
  intent?: Intent;
  title?: string;
  children?: React.ReactNode;
  icon?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const s = STYLES[intent];
  return (
    <div className={cn("flex gap-3 rounded-xl border p-4", s.wrap, className)}>
      <Icon name={icon ?? s.defaultIcon} className={cn("mt-0.5 h-5 w-5 shrink-0", s.icon)} />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold text-slate-800">{title}</p>}
        {children && <div className={cn("text-slate-600", title && "mt-0.5")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
