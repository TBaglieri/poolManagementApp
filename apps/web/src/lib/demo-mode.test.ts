import { describe, it, expect } from "vitest";
import { allowsDemoLoginFallback, showsLocalDemoChip, requiresLoginRedirect } from "./demo-mode";

/**
 * §4g — the demo experience (seeded demo user + "Local demo" chrome) is scoped to
 * the demo tenant only. A real tenant never falls back to a demo user, and an
 * unauthenticated session goes to login rather than rendering demo chrome.
 */
describe("demo-mode scoping", () => {
  it("real tenant NEVER falls back to a demo login, in either data mode", () => {
    expect(allowsDemoLoginFallback(false, false)).toBe(false); // real tenant, mock data
    expect(allowsDemoLoginFallback(false, true)).toBe(false);  // real tenant, supabase
  });

  it("demo tenant uses the seeded fallback only without a real backend", () => {
    expect(allowsDemoLoginFallback(true, false)).toBe(true);   // demo tenant, mock → demo login
    expect(allowsDemoLoginFallback(true, true)).toBe(false);   // demo tenant, supabase → real auth
  });

  it("the 'Local demo' chip shows only in the demo tenant", () => {
    expect(showsLocalDemoChip(false, "mock")).toBe(false);     // real tenant → no demo chrome
    expect(showsLocalDemoChip(true, "mock")).toBe(true);       // demo tenant → chip ok
    expect(showsLocalDemoChip(true, "supabase")).toBe(false);  // not mock → not this chip
  });

  it("an unauthenticated (hydrated) session must redirect to login", () => {
    expect(requiresLoginRedirect(true, null)).toBe(true);       // no role → login, not a demo user
    expect(requiresLoginRedirect(true, "org_admin")).toBe(false);
    expect(requiresLoginRedirect(false, null)).toBe(false);     // not hydrated yet → wait
  });
});
