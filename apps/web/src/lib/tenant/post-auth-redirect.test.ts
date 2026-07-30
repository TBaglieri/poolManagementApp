import { describe, it, expect, vi } from "vitest";
import { postAuthDestination, type MembershipInput } from "@poolops/shared";

/**
 * §6 — EVERY auth entry point (login, sign-up/invite, password-reset completion,
 * magic link) routes through the ONE shared `resolveTenantAndRedirect`, so a tenant
 * user ALWAYS lands in their own tenant and NEVER falls through to root/platform.
 *
 * The Supabase-backed membership lookup is mocked so the routing decision is driven
 * by fixed membership records — the same records every entry point would resolve.
 */
const state = vi.hoisted(() => ({ memberships: [] as MembershipInput[] }));
vi.mock("./user-tenant", () => ({
  resolveUserMemberships: vi.fn(async () => state.memberships),
}));

import { resolveTenantAndRedirect, postAuthUrl } from "./post-auth-redirect";

const VILLAS: MembershipInput[] = [{ slug: "villas", orgName: "Villas on the Ridge", role: "org_admin" }];
const TIDETOWN: MembershipInput[] = [{ slug: "tidetown", orgName: "Tide & Town Aquatics", role: "org_admin" }];
const MULTI: MembershipInput[] = [...VILLAS, ...TIDETOWN];
const PLATFORM: MembershipInput[] = [{ slug: "platform", orgName: "PoolOps Pro", role: "super_admin", isPlatform: true }];
const NONE: MembershipInput[] = [];

function spies() {
  return { onTenant: vi.fn(), onPicker: vi.fn(), onPlatform: vi.fn(), onNoAccess: vi.fn() };
}

/** Run the shared resolver for a given membership set (as every entry point does). */
async function route(memberships: MembershipInput[]) {
  state.memberships = memberships;
  const h = spies();
  const dest = await resolveTenantAndRedirect("user-123", h);
  return { dest, h };
}

describe("postAuthUrl — the concrete destination", () => {
  it("a single tenant membership → the tenant URL, never root", () => {
    expect(postAuthUrl(postAuthDestination(VILLAS))).toBe("/villas/dashboard");
  });
  it("a platform account → the platform dashboard", () => {
    expect(postAuthUrl(postAuthDestination(PLATFORM))).toBe("/dashboard");
  });
  it("picker and no-access have no single URL (caller handles them)", () => {
    expect(postAuthUrl(postAuthDestination(MULTI))).toBeNull();
    expect(postAuthUrl(postAuthDestination(NONE))).toBeNull();
  });
});

describe("resolveTenantAndRedirect — one decision for every auth entry point", () => {
  it("a Villas user lands in the Villas tenant (login / reset / sign-up / magic link)", async () => {
    const { dest, h } = await route(VILLAS);
    expect(dest.kind).toBe("tenant");
    expect(h.onTenant).toHaveBeenCalledTimes(1);
    const choice = h.onTenant.mock.calls[0][0];
    expect(choice.slug).toBe("villas");
    expect(`/${choice.slug}${choice.path}`).toBe("/villas/dashboard");
    // Never root, never any other handler.
    expect(h.onPlatform).not.toHaveBeenCalled();
    expect(h.onPicker).not.toHaveBeenCalled();
    expect(h.onNoAccess).not.toHaveBeenCalled();
  });

  it("a Villas user is NEVER routed into another tenant or root", async () => {
    const { h } = await route(VILLAS);
    const choice = h.onTenant.mock.calls[0][0];
    expect(choice.slug).not.toBe("tidetown");
    expect(choice.slug).not.toBe("platform");
    expect(choice.slug).not.toBe("default");
    expect(`/${choice.slug}${choice.path}`).not.toBe("/dashboard");
  });

  it("no membership (non-platform) → no-access, never a silent drop to root", async () => {
    const { dest, h } = await route(NONE);
    expect(dest.kind).toBe("no-access");
    expect(h.onNoAccess).toHaveBeenCalledTimes(1);
    expect(h.onTenant).not.toHaveBeenCalled();
    expect(h.onPlatform).not.toHaveBeenCalled();
  });

  it("more than one tenant → a picker (no silent guess)", async () => {
    const { dest, h } = await route(MULTI);
    expect(dest.kind).toBe("picker");
    expect(h.onPicker).toHaveBeenCalledTimes(1);
    const choices = h.onPicker.mock.calls[0][0];
    expect(choices.map((c: { slug: string }) => c.slug).sort()).toEqual(["tidetown", "villas"]);
    expect(h.onTenant).not.toHaveBeenCalled();
  });

  it("a platform/super-admin account → the platform context", async () => {
    const { dest, h } = await route(PLATFORM);
    expect(dest.kind).toBe("platform");
    expect(h.onPlatform).toHaveBeenCalledTimes(1);
    expect(h.onTenant).not.toHaveBeenCalled();
  });
});
