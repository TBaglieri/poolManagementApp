"use client";

/**
 * Tenant-branded logo + loading experience. Reads the active tenant's config, so
 * the mark shows the tenant's uploaded logo (or a monogram tile in the tenant's
 * brand color) and the wordmark shows the tenant's display name. All brand colors
 * come from tokens, so this restyles automatically per tenant.
 */
import { Waves } from "lucide-react";
import { ORG_TYPE_LABELS, INLINE_ICONS, inlineIconId } from "@poolops/shared";
import { cn } from "@/lib/cn";
import { useTenantConfig } from "@/lib/tenant/provider";

const SIZES = {
  sm: { box: "h-7 w-7 rounded-lg text-[11px]", icon: "h-4 w-4", text: "text-base" },
  md: { box: "h-9 w-9 rounded-xl text-xs", icon: "h-5 w-5", text: "text-lg" },
  lg: { box: "h-12 w-12 rounded-2xl text-sm", icon: "h-7 w-7", text: "text-2xl" },
  xl: { box: "h-16 w-16 rounded-2xl text-base", icon: "h-9 w-9", text: "text-3xl" },
} as const;

type Size = keyof typeof SIZES;

/** The tenant's icon-only mark (no wordmark). Inline SVG, raster/vector URL, or a
 *  monogram tile — all in the tenant's brand color. Used for the home button. */
export function TenantMark({ size = "md", className, mono = false }: { size?: Size; className?: string; mono?: boolean }) {
  const config = useTenantConfig();
  const s = SIZES[size];
  const icon = config.branding.icon;
  const inline = inlineIconId(icon);

  // Inline vector mark → renders in white on the brand tile, crisp at any size and
  // fully legible on both light and dark app chrome.
  if (inline) {
    const def = INLINE_ICONS[inline];
    return (
      <span
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-sm ring-1 ring-brand-700/20",
          s.box, className,
        )}
        aria-hidden
      >
        <svg viewBox={def.viewBox} className={s.icon} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          {def.paths.map((d, i) => <path key={i} d={d} />)}
        </svg>
      </span>
    );
  }

  // Explicit icon asset URL (e.g. the Villas houses mark). Render it INSIDE the
  // tenant's brand tile — the same colored box the monogram/inline marks get — so an
  // image-logo tenant looks branded, not like an empty/letterboxed square. The mark
  // sits ON a colored tile, so use the light-on-dark variant when the tenant ships
  // one; `object-contain` keeps the whole logo visible (no crop), and the tile fills
  // the box edge-to-edge with only a hair of inset so the art never touches a corner.
  const iconUrl = icon && !icon.startsWith("inline:") ? icon : undefined;
  if (iconUrl) {
    const tileIcon = config.branding.iconDark ?? iconUrl;
    return (
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-400 to-brand-700 shadow-sm ring-1 ring-brand-700/20",
          s.box, className,
        )}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={tileIcon} alt={`${config.displayName} logo`} className="h-full w-full object-contain p-[12%]" />
      </span>
    );
  }

  // A full logo image with no dedicated icon.
  if (config.branding.logoLight) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={config.branding.logoLight} alt={`${config.displayName} logo`} className={cn("object-contain", s.box, className)} />;
  }

  return (
    <span
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-700 font-bold text-white shadow-sm ring-1 ring-brand-700/20",
        s.box, className,
      )}
      aria-hidden
    >
      {config.branding.monogram
        ? <span className="tracking-tight">{config.branding.monogram}</span>
        : <Waves className={s.icon} strokeWidth={2.4} />}
    </span>
  );
}

export function TenantWordmark({
  size = "md", mono = false, showType = false, className,
}: {
  size?: Size;
  mono?: boolean;
  showType?: boolean;
  className?: string;
}) {
  const config = useTenantConfig();
  const s = SIZES[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <TenantMark size={size} mono={mono} />
      <span className="flex min-w-0 flex-col leading-none">
        <span className={cn("truncate font-bold tracking-tight", s.text, mono ? "text-white" : "text-slate-900")}>
          {config.displayName}
        </span>
        {showType && (
          <span className={cn("mt-1 truncate text-[11px] font-medium", mono ? "text-white/60" : "text-slate-400")}>
            {ORG_TYPE_LABELS[config.organizationType]}
          </span>
        )}
      </span>
    </span>
  );
}

/** Full-screen branded loading experience with a gentle water ripple. */
export function TenantSplash({ label }: { label?: string }) {
  const config = useTenantConfig();
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex h-24 w-24 items-center justify-center">
          {/* concentric ripples */}
          <span className="absolute inset-0 rounded-full bg-brand-400/30 animate-ripple" />
          <span className="absolute inset-0 rounded-full bg-brand-400/20 animate-ripple [animation-delay:0.6s]" />
          <span className="absolute inset-0 rounded-full bg-brand-400/10 animate-ripple [animation-delay:1.2s]" />
          <span className="animate-waterline">
            <TenantMark size="xl" />
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-lg font-bold tracking-tight text-slate-900">{config.displayName}</p>
          <p className="text-sm font-medium text-slate-400">{label ?? "Loading…"}</p>
        </div>
      </div>
    </div>
  );
}
