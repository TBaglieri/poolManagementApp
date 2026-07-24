import { NextResponse, type NextRequest } from "next/server";
import { resolveTenant, getTenantConfig, isPathEnabled, moduleForPath, DEMO_TENANT_SLUG, isPlatformPath, REAL_TENANT_SOURCES } from "@poolops/shared/tenant";

/**
 * Tenant resolution + server-side module gating + gated-demo access.
 *
 * Host (subdomain / custom domain) is the PRIMARY mechanism. The first URL path
 * segment is a FALLBACK so this deployment can reach a tenant at
 * `https://<app>.vercel.app/<slug>` today with no custom domain, and move to a
 * subdomain later with no rework. See resolveTenant() for the full order.
 *
 * The DEMO tenant is never public: it resolves ONLY with a `demo_access` cookie
 * set by `/enter-demo?token=<secret>`.
 */

// Deployment pin. Keep a default so the single-tenant deployment always resolves;
// set NEXT_PUBLIC_TENANT to lock a subdomain deploy to one tenant.
const DEFAULT_TENANT = process.env.NEXT_PUBLIC_TENANT || "villas";
const DEMO_ACCESS_TOKEN = process.env.DEMO_ACCESS_TOKEN || "poolops-demo";

const CUSTOM_DOMAINS: Record<string, string> = {
  // "pool.villasontheridge.com": "villas",
};

function hasDemoAccess(req: NextRequest): boolean {
  // Local-dev convenience: in mock mode (no real backend) the gated demo is open so
  // `npm run dev` needs no token or password. Real (supabase) deployments are
  // unaffected and still require the secret token.
  if ((process.env.NEXT_PUBLIC_DATA_MODE || "").toLowerCase() !== "supabase") return true;
  return req.cookies.get("demo_access")?.value === DEMO_ACCESS_TOKEN;
}

export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // ---- Gated demo entry: /enter-demo?token=<secret> --------------------------
  if (pathname === "/enter-demo") {
    const token = url.searchParams.get("token");
    if (token && token === DEMO_ACCESS_TOKEN) {
      const headers = new Headers(req.headers);
      headers.set("x-tenant-slug", DEMO_TENANT_SLUG);
      const res = NextResponse.next({ request: { headers } });
      res.cookies.set("demo_access", DEMO_ACCESS_TOKEN, { path: "/", sameSite: "lax" });
      res.cookies.set("tenant", DEMO_TENANT_SLUG, { path: "/", sameSite: "lax" });
      return res;
    }
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("demo_access");
    return res;
  }

  // ---- Leaving the demo ------------------------------------------------------
  if (pathname === "/leave-demo") {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("demo_access");
    res.cookies.delete("tenant");
    return res;
  }

  const resolution = resolveTenant({
    host: req.headers.get("host"),
    pathname,
    queryTenant: url.searchParams.get("tenant"),
    demoAccess: hasDemoAccess(req),
    cookieTenant: req.cookies.get("tenant")?.value ?? null,
    envDefault: DEFAULT_TENANT,
    customDomains: CUSTOM_DOMAINS,
  });

  let slug = resolution.slug;

  // PLATFORM (non-tenant) page: no REAL tenant signal (only a cookie/env fallback,
  // or none) AND a platform path → render the PoolOps Pro platform brand, never a
  // tenant's. This is what stops a "last loaded tenant" cookie/default from leaking
  // Villas onto the landing page, root login, or their metadata / OG previews.
  if (!REAL_TENANT_SOURCES.includes(resolution.source) && isPlatformPath(pathname)) {
    const headers = new Headers(req.headers);
    headers.set("x-platform", "1");
    headers.delete("x-tenant-slug");
    return NextResponse.next({ request: { headers } });
  }

  // No tenant at all → neutral "unknown facility" page (never crash/blank).
  if (!slug) {
    return NextResponse.rewrite(new URL("/unknown-facility", req.url));
  }
  // The demo tenant is never resolvable without a valid access cookie.
  if (slug === DEMO_TENANT_SLUG && !hasDemoAccess(req)) slug = DEFAULT_TENANT;

  // The route to gate/serve is the de-prefixed path when the tenant came from the URL.
  const effectivePath = resolution.strippedPath ?? pathname;

  // The /m/* mobile-preview surface is a demo-only feature — block it for real tenants.
  if (effectivePath.startsWith("/m/") && slug !== DEMO_TENANT_SLUG) {
    const res = NextResponse.redirect(new URL("/dashboard", req.url));
    res.cookies.set("tenant", slug, { path: "/", sameSite: "lax" });
    return res;
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant-slug", slug);

  // Server-side module gate: block routes for disabled modules.
  if (moduleForPath(effectivePath) && !isPathEnabled(getTenantConfig(slug), effectivePath)) {
    const res = NextResponse.redirect(new URL("/dashboard", req.url));
    res.cookies.set("tenant", slug, { path: "/", sameSite: "lax" });
    return res;
  }

  // Path-based tenant: rewrite to strip the `/<slug>` prefix so real routes serve.
  if (resolution.source === "path") {
    const rewriteUrl = new URL(effectivePath + url.search, req.url);
    const res = NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
    res.cookies.set("tenant", slug, { path: "/", sameSite: "lax" });
    return res;
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.cookies.set("tenant", slug, { path: "/", sameSite: "lax" });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif|css|js)$).*)"],
};
