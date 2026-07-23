import "server-only";
import { headers, cookies } from "next/headers";
import {
  getTenantConfig, TenantConfigSchema, deepMerge, PLATFORM_CONFIG, PLATFORM_SLUG, type TenantConfig,
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
