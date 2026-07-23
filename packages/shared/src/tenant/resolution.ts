/**
 * Tenant *request* resolution — decide which tenant a request belongs to.
 *
 * Pure and framework-free so it's unit-testable and shared by middleware. Host
 * (subdomain / custom domain) is the PRIMARY mechanism; the first URL path
 * segment is a FALLBACK so a no-custom-domain deployment can reach a tenant at
 * `https://<app>.vercel.app/<slug>` today and switch to a subdomain later with no
 * rework. A `?tenant=` query is a dev override; a cookie persists a prior explicit
 * selection across clean-URL navigation.
 */
import { KNOWN_TENANT_SLUGS, DEMO_TENANT_SLUG } from "./registry";

export type TenantSource =
  | "query" | "demo" | "subdomain" | "custom-domain" | "path" | "cookie" | "env" | "none";

export interface TenantResolutionInput {
  host?: string | null;
  pathname?: string | null;
  /** value of the `?tenant=` query param (dev override) */
  queryTenant?: string | null;
  /** true when a valid demo access cookie is present */
  demoAccess?: boolean;
  /** the `tenant` cookie value (persists an explicit selection) */
  cookieTenant?: string | null;
  /** deployment pin, e.g. NEXT_PUBLIC_TENANT */
  envDefault?: string | null;
  customDomains?: Record<string, string>;
}

export interface TenantResolution {
  /** null = no tenant could be resolved (caller shows a neutral/landing page) */
  slug: string | null;
  source: TenantSource;
  /** for a path match, the pathname with the `/<slug>` prefix removed */
  strippedPath?: string;
}

/** First non-empty path segment, lowercased. */
export function firstPathSegment(pathname?: string | null): string {
  if (!pathname) return "";
  return pathname.replace(/^\/+/, "").split("/")[0]?.toLowerCase() ?? "";
}

/** Sources that indicate a REAL tenant signal (vs. a cookie/env fallback). */
export const REAL_TENANT_SOURCES: TenantSource[] = ["query", "demo", "subdomain", "custom-domain", "path"];

/**
 * Platform (non-tenant) page paths — landing, root login, marketing, onboarding.
 * These render the PoolOps Pro platform brand, never a tenant's, UNLESS a real
 * tenant signal (a `/<slug>` path or a tenant host) is present. The authenticated
 * app routes (/dashboard, /staff, …) are deliberately NOT here — they carry tenant
 * context via the cookie after the `/<slug>` prefix is stripped.
 */
const PLATFORM_PREFIXES = [
  "/login", "/pricing", "/quote", "/enter-demo", "/leave-demo",
  "/unknown-facility", "/setup", "/accept-invite", "/reset-password", "/forgot-password",
];

export function isPlatformPath(pathname?: string | null): boolean {
  const p = (pathname || "/").toLowerCase();
  if (p === "/") return true;
  return PLATFORM_PREFIXES.some((pre) => p === pre || p.startsWith(pre + "/"));
}

/** A slug we're willing to INFER from host/path/cookie (known + not the gated demo). */
function inferable(slug?: string | null): boolean {
  return !!slug && KNOWN_TENANT_SLUGS.includes(slug.toLowerCase()) && slug.toLowerCase() !== DEMO_TENANT_SLUG;
}

export function resolveTenant(input: TenantResolutionInput): TenantResolution {
  // 1. Explicit query override (dev/local).
  if (input.queryTenant) return { slug: input.queryTenant.toLowerCase(), source: "query" };

  // 2. Gated demo (only ever via a valid access cookie).
  if (input.demoAccess) return { slug: DEMO_TENANT_SLUG, source: "demo" };

  // 3. Host — PRIMARY. Custom domain first, then subdomain.
  const host = (input.host || "").split(":")[0].toLowerCase();
  const mappedDomain = input.customDomains?.[host];
  if (mappedDomain) return { slug: mappedDomain, source: "custom-domain" };

  const parts = host.split(".");
  const isPlainHost = host === "localhost" || host === "" || /^(\d+\.){3}\d+$/.test(host);
  if (!isPlainHost && parts.length >= 3 && parts[0] !== "www" && inferable(parts[0])) {
    return { slug: parts[0], source: "subdomain" };
  }

  // 4. Path first segment — FALLBACK for no-domain deployments (.../villas).
  const seg = firstPathSegment(input.pathname);
  if (inferable(seg)) {
    const rest = (input.pathname || "").replace(/^\/+/, "").split("/").slice(1).join("/");
    return { slug: seg, source: "path", strippedPath: rest ? `/${rest}` : "/" };
  }

  // 5. Cookie — persists a prior explicit selection across clean-URL navigation.
  if (inferable(input.cookieTenant)) return { slug: input.cookieTenant!.toLowerCase(), source: "cookie" };

  // 6. Deployment pin (trusted, need not be in the registry).
  if (input.envDefault) return { slug: input.envDefault.toLowerCase(), source: "env" };

  // 7. Nothing resolved.
  return { slug: null, source: "none" };
}
