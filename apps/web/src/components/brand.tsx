import { Waves } from "lucide-react";
import { cn } from "@/lib/cn";

const SIZES = {
  sm: { box: "h-7 w-7 rounded-lg", icon: "h-4 w-4", text: "text-base" },
  md: { box: "h-9 w-9 rounded-xl", icon: "h-5 w-5", text: "text-lg" },
  lg: { box: "h-12 w-12 rounded-2xl", icon: "h-7 w-7", text: "text-2xl" },
} as const;

export function BrandMark({ size = "md", className }: { size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  return (
    <span
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-sm ring-1 ring-brand-700/20",
        s.box, className,
      )}
    >
      <Waves className={s.icon} strokeWidth={2.4} />
    </span>
  );
}

export function Logo({
  size = "md", className, mono = false, subtitle,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  mono?: boolean;
  subtitle?: string;
}) {
  const s = SIZES[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={size} />
      <span className="flex flex-col leading-none">
        <span className={cn("font-bold tracking-tight", s.text, mono ? "text-white" : "text-slate-900")}>
          PoolOps<span className="text-brand-500"> Pro</span>
        </span>
        {subtitle && (
          <span className={cn("mt-1 text-[11px] font-medium", mono ? "text-white/60" : "text-slate-400")}>
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
