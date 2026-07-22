import { NextResponse, type NextRequest } from "next/server";
import { getTenantConfig, isPathEnabled, KNOWN_TENANT_SLUGS, moduleForPath } from "@poolops/shared/tenant";

/**
 * Tenant resolution + server-side module gating.
 *
 * Resolution order (most specific first):
 *   1. `?tenant=` query          — local/dev override
 *   2. NEXT_PUBLIC_TENANT env     — deployment pin
 *   3. subdomain                  — villas.myapp.com → "villas" (primary mechanism)
 *   4. custom domain map          — pool.villasontheridge.com → "villas"
 *   5. default                    — the trial customer, Villas on the Ridge
 *
 * A resolved slug is put on the request header (read by the server layout) and a
 * cookie (fallback). Requests to a route whose owning module is DISABLED for the
 * tenant are redirected to the dashboard — real server-side enforcement, not just
 * hidden nav.
 */

const DEFAULT_TENANT = process.env.NEXT_PUBLIC_TENANT || "villas";

// Fill in when a customer points their own domain at the app.
const CUSTOM_DOMAINS: Record<string, string> = {
  // "pool.villasontheridge.com": "villas",
};

function resolveSlug(req: NextRequest): string {
  const url = new URL(req.url);
  const q = url.searchParams.get("tenant");
  if (q) return q.toLowerCase();

  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  if (CUSTOM_DOMAINS[host]) return CUSTOM_DOMAINS[host];

  const parts = host.split(".");
  const isPlainHost = host === "localhost" || /^(\d+\.){3}\d+$/.test(host);
  if (!isPlainHost && parts.length >= 3 && parts[0] !== "www") {
    const sub = parts[0];
    if (KNOWN_TENANT_SLUGS.includes(sub)) return sub;
  }
  return DEFAULT_TENANT;
}

export function middleware(req: NextRequest) {
  const slug = resolveSlug(req);
  const pathname = new URL(req.url).pathname;

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
  // Run on everything except static assets and Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif|css|js)$).*)"],
};
