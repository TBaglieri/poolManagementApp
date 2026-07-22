import type { Metadata } from "next";
import type { TenantConfig } from "@poolops/shared";
import { faviconDataUri } from "./theme-css";

/**
 * Build a tenant's page metadata — title, description, Open Graph + Twitter card,
 * favicon and apple-touch icon — entirely from its config, so a pasted tenant link
 * unfurls into that tenant's branded card in iMessage / SMS / modern webmail. Pure
 * (no request access) so it's unit-testable and provably per-tenant: pool #2
 * resolves to ITS name and image, never Villas'.
 */
export interface TenantMetaContext {
  /** Absolute origin of the request, e.g. "https://app.vercel.app" (no trailing slash). */
  origin: string;
  /** The tenant slug (path/subdomain segment). */
  slug: string;
}

function absolute(origin: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

function safeBase(origin: string): URL | undefined {
  try { return new URL(origin); } catch { return undefined; }
}

export function tenantMetadata(config: TenantConfig, ctx: TenantMetaContext): Metadata {
  const name = config.displayName;
  const description = config.copy.tagline;
  const url = `${ctx.origin}/${ctx.slug}`;
  // A tenant-supplied favicon file (e.g. Villas' houses tile) wins; otherwise a
  // generated brand-color mark keeps every tenant's tab on-brand out of the box.
  const favicon = config.branding.favicon ? absolute(ctx.origin, config.branding.favicon) : faviconDataUri(config);

  // Social card: a tenant-supplied image if set, else the per-tenant generated card.
  const ogImage = config.branding.ogImage ? absolute(ctx.origin, config.branding.ogImage) : `${ctx.origin}/api/og/${ctx.slug}`;
  const touch = config.branding.appleTouchIcon ? absolute(ctx.origin, config.branding.appleTouchIcon) : favicon;

  return {
    metadataBase: safeBase(ctx.origin),
    title: { default: `${config.productName} — Pool Management`, template: `%s · ${config.productName}` },
    description,
    applicationName: config.productName,
    icons: { icon: favicon, apple: touch },
    openGraph: {
      type: "website",
      siteName: name,
      title: name,
      description,
      url,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${name} — pool portal` }],
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description,
      images: [ogImage],
    },
  };
}
