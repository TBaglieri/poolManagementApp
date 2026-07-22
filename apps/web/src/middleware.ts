import { NextResponse, type NextRequest } from "next/server";
import { getTenantConfig, isPathEnabled, KNOWN_TENANT_SLUGS, moduleForPath, DEMO_TENANT_SLUG } from "@poolops/shared/tenant";

/**
 * Tenant resolution + server-side module gating + gated-demo access.
 *
 * Resolution order (most specific first):
 *   1. `?tenant=` query          — local/dev override
 *   2. valid demo access cookie   — once granted, the visitor stays in the demo
 *   3. NEXT_PUBLIC_TENANT env      — deployment pin
 *   4. subdomain                   — villas.myapp.com → "villas" (primary mechanism)
 *   5. custom domain map           — pool.villasontheridge.com → "villas"
 *   6. default                     — the trial customer, Villas on the Ridge
 *
 * The DEMO tenant is never public: it resolves ONLY when a `demo_access` cookie
 * matching DEMO_ACCESS_TOKEN is present, which is set only by hitting
 * `/enter-demo?token=<secret>`. Nothing in the product links to it.
 */

const DEFAULT_TENANT = process.env.NEXT_PUBLIC_TENANT || "villas";
// Dev fallback so the demo is reachable locally; ALWAYS override in production.
const DEMO_ACCESS_TOKEN = process.env.DEMO_ACCESS_TOKEN || "poolops-demo";

const CUSTOM_DOMAINS: Record<string, string> = {
  // "pool.villasontheridge.com": "villas",
};

function hasDemoAccess(req: NextRequest): boolean {
  return req.cookies.get("demo_access")?.value === DEMO_ACCESS_TOKEN;
}

function resolveSlug(req: NextRequest): string {
  const url = new URL(req.url);
  const q = url.searchParams.get("tenant");
  if (q) return q.toLowerCase();

  // A visitor with a valid demo token stays in the demo until they leave.
  if (hasDemoAccess(req)) return DEMO_TENANT_SLUG;

  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  if (CUSTOM_DOMAINS[host]) return CUSTOM_DOMAINS[host];

  const parts = host.split(".");
  const isPlainHost = host === "localhost" || /^(\d+\.){3}\d+$/.test(host);
  if (!isPlainHost && parts.length >= 3 && parts[0] !== "www") {
    const sub = parts[0];
    if (KNOWN_TENANT_SLUGS.includes(sub) && sub !== DEMO_TENANT_SLUG) return sub;
  }
  return DEFAULT_TENANT;
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
    // Invalid/missing token → not discoverable; bounce to normal sign-in.
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

  let slug = resolveSlug(req);
  // Never resolve the demo tenant without a valid access cookie.
  if (slug === DEMO_TENANT_SLUG && !hasDemoAccess(req)) slug = DEFAULT_TENANT;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant-slug", slug);

  // Server-side module gate: block routes for disabled modules.
  if (moduleForPath(pathname) && !isPathEnabled(getTenantConfig(slug), pathname)) {
    const dash = new URL("/dashboard", req.url);
    const res = NextResponse.redirect(dash);
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
