import { initials } from "@poolops/shared";
import { cn } from "@/lib/cn";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-xl",
} as const;

export function StaffAvatar({
  name, color = "#0E7490", size = "md", className, ring = false,
}: {
  name: string;
  color?: string;
  size?: keyof typeof SIZES;
  className?: string;
  ring?: boolean;
}) {
  const [first, last] = name.split(" ");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        SIZES[size], ring && "ring-2 ring-white", className,
      )}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials(first ?? name, last)}
    </span>
  );
}

export function AvatarStack({
  people, max = 4, size = "sm",
}: {
  people: { name: string; color: string }[];
  max?: number;
  size?: keyof typeof SIZES;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((p, i) => (
        <StaffAvatar key={i} name={p.name} color={p.color} size={size} ring />
      ))}
      {extra > 0 && (
        <span className={cn(
          "inline-flex items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 ring-2 ring-white",
          SIZES[size],
        )}>
          +{extra}
        </span>
      )}
    </div>
  );
}
