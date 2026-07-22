/**
 * Demo-mode scoping rules (pure, unit-tested).
 *
 * The demo experience — a seeded role-switcher identity and "Local demo" chrome —
 * must exist ONLY in the explicitly-designated demo tenant, never as a global
 * default and never for a real authenticated session on a real tenant. These
 * predicates centralize that rule so the login page, the sync pill, and the app
 * shell all agree. See AUDIT.md §4g.
 */
import type { RoleSlug } from "@poolops/shared";

/**
 * May the sign-in form fall back to a seeded demo role (no real auth)? Only on the
 * demo tenant, and only when there's no real backend to authenticate against. A real
 * tenant NEVER falls back to a demo user — it must use the real Supabase session.
 */
export function allowsDemoLoginFallback(isDemoTenant: boolean, supabaseMode: boolean): boolean {
  return isDemoTenant && !supabaseMode;
}

/** Should the "Local demo" (mock data) chip render? Only inside the demo tenant. */
export function showsLocalDemoChip(isDemoTenant: boolean, mode: "mock" | "supabase"): boolean {
  return isDemoTenant && mode === "mock";
}

/** After hydration, a session with no role must be sent to login (never demo). */
export function requiresLoginRedirect(hydrated: boolean, role: RoleSlug | null): boolean {
  return hydrated && !role;
}
