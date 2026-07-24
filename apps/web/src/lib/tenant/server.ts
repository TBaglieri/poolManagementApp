import "server-only";
import { headers, cookies } from "next/headers";
import {
  getTenantConfig, TenantConfigSchema, deepMerge, PLATFORM_CONFIG, PLATFORM_SLUG,
  isPlatformSlug, DEMO_TENANT_SLUG, type TenantConfig,
} from "@poolops/shared";
import { getEffectiveDataMode } from "@poolops/supabase";
import { getServerSupabase } from "@poolops/supabase/server";

/** Deployment default tenant. For this trial it's the customer, Villas on the Ridge. */
export const DEFAULT_TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT || "villas";

/** True when the middleware marked this request as a PLATFORM (non-tenant) page. */
export function isPlatformRequest(): boolean {
  return headers().get("x-platform") === "1";
}

/** Active tenant slug for the current request (set by middleware; cookie fallback). */
export function getTenantSlug(): string {
  if (isPlatformRequest()) return PLATFORM_SLUG;
  const fromHeader = headers().get("x-tenant-slug");
  if (fromHeader) return fromHeader;
  const fromCookie = cookies().get("tenant")?.value;
  return fromCookie || DEFAULT_TENANT_SLUG;
}

/** True if the request carries a Supabase auth session cookie. */
function hasSupabaseSession(): boolean {
  return cookies().getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

/**
 * Resolved, validated tenant config for the current request.
 *
 * Source of truth is the in-code registry (fast, works pre-auth so the branded
 * login page never flashes). For an AUTHENTICATED user in supabase mode we also
 * read `organizations.config` and deep-merge it on top — that's the production
 * "config lives in the database" path. Any error (missing column, RLS, network)
 * falls back to the registry, so the app always renders.
 */
export async function getServerTenantConfig(): Promise<TenantConfig> {
  // Platform (non-tenant) pages always render the PoolOps Pro brand.
  if (isPlatformRequest()) return PLATFORM_CONFIG;

  const slug = getTenantSlug();
  const base = getTenantConfig(slug);

  // Only hit the DB for a real signed-in session (skips anon/demo → keeps it fast).
  if (getEffectiveDataMode() !== "supabase" || !hasSupabaseSession()) return base;

  try {
    const supabase = getServerSupabase();
    if (!supabase) return base;
    const { data, error } = await supabase
      .from("organizations")
      .select("config")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();
    if (error || !data?.config) return base;
    return TenantConfigSchema.parse(deepMerge(base, data.config));
  } catch {
    return base;
  }
}

/**
 * Server-side tenant access guard: may the SIGNED-IN user load the CURRENT tenant?
 *
 * This closes the "type another tenant's URL" hole — a Villas user must not reach
 * `/tidetown/*` just by typing it. Enforced on the server (in the (app) layout),
 * not by hiding nav. RLS is still the data boundary; this stops the wrong-tenant
 * shell from rendering at all.
 *
 * Returns "deny" ONLY on a definitive "not a member" result. There is nothing to
 * enforce for mock/demo, platform pages, or a request with no session (the shell
 * redirects those to /login already), so those return "allow". Transient errors
 * fail OPEN — a DB hiccup must never lock a legitimate member out.
 */
export async function getTenantAccess(): Promise<"allow" | "deny"> {
  if (isPlatformRequest()) return "allow";
  if (getEffectiveDataMode() !== "supabase" || !hasSupabaseSession()) return "allow";
  const slug = getTenantSlug();
  if (isPlatformSlug(slug) || slug === DEMO_TENANT_SLUG) return "allow";
  try {
    const supabase = getServerSupabase();
    if (!supabase) return "allow";
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return "allow"; // no session → AppShell handles the login redirect
    const { data, error } = await supabase
      .from("organization_members")
      .select("role_slug, organizations(slug)")
      .eq("profile_id", uid)
      .eq("status", "active");
    if (error) return "allow"; // fail open — RLS still scopes the data
    const rows = (data ?? []) as any[];
    const member = rows.some((r) => {
      const org = Array.isArray(r.organizations) ? r.organizations[0] : r.organizations;
      // Platform owner (super_admin) may enter any tenant; otherwise require a
      // membership whose org resolves to this slug.
      return r.role_slug === "super_admin" || org?.slug === slug;
    });
    return member ? "allow" : "deny";
  } catch {
    return "allow";
  }
}
