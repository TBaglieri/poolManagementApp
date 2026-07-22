import { getRole, type RoleSlug } from "@poolops/shared";
import { cn } from "@/lib/cn";
import { INTENT_CLASSES, INTENT_DOT, type Intent } from "@/lib/status";

export function Badge({
  children, intent = "neutral", dot = false, className,
}: {
  children: React.ReactNode;
  intent?: Intent;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("chip", INTENT_CLASSES[intent], className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", INTENT_DOT[intent])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ label, intent, dot = true }: { label: string; intent: Intent; dot?: boolean }) {
  return <Badge intent={intent} dot={dot}>{label}</Badge>;
}

const ROLE_ACCENT: Record<string, string> = {
  navy: "bg-navy-100 text-navy-700 ring-navy-600/20",
  cyan: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  teal: "bg-teal-50 text-teal-700 ring-teal-600/20",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

export function RoleBadge({ role, className }: { role: RoleSlug; className?: string }) {
  const meta = getRole(role);
  return (
    <span className={cn("chip ring-1 ring-inset", ROLE_ACCENT[meta.accent] ?? ROLE_ACCENT.slate, className)}>
      {meta.shortName}
    </span>
  );
}
