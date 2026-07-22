import { ImageResponse } from "next/og";
import { getTenantConfig, inlineIconId, INLINE_ICONS } from "@poolops/shared";
import { brandHex } from "@/lib/tenant/theme-css";

/**
 * Per-tenant social preview card (1200×630), generated from the tenant's config
 * with next/og. This is the image that unfurls when a tenant link is pasted into
 * iMessage / SMS / modern webmail. Public (crawlers fetch it unauthenticated) and
 * driven entirely by `params.slug`, so pool #2 renders ITS name + brand, not
 * Villas'. A tenant that sets `branding.ogImage` uses that static image instead
 * (see tenantMetadata) and never reaches this route.
 */
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const config = getTenantConfig(params.slug);
  const brand = brandHex(config, 700);
  const brandLight = brandHex(config, 600);
  const inline = inlineIconId(config.branding.icon);
  const houses = inline ? INLINE_ICONS[inline] : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "96px",
          backgroundImage: `linear-gradient(135deg, ${brand} 0%, ${brandLight} 100%)`,
          color: "#ffffff", fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "36px" }}>
          <div
            style={{
              width: 168, height: 168, borderRadius: 40, display: "flex",
              alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.14)", border: "2px solid rgba(255,255,255,0.35)",
            }}
          >
            {houses ? (
              <svg width="112" height="112" viewBox={houses.viewBox} fill="none" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                {houses.paths.map((d, i) => <path key={i} d={d} />)}
              </svg>
            ) : (
              <div style={{ fontSize: 84, fontWeight: 800 }}>{(config.branding.monogram || "P").slice(0, 2)}</div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>{config.displayName}</div>
            <div style={{ marginTop: 20, fontSize: 34, opacity: 0.9 }}>{config.copy.tagline}</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
