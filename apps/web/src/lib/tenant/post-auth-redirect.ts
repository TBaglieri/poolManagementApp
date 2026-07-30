"use client";

/**
 * The SINGLE post-authentication routing decision for EVERY web auth entry point —
 * login, sign-up / invite acceptance, password-reset completion, and any Supabase
 * auth callback (magic link). It resolves the user's ACTIVE organization
 * memberships and runs the shared, membership-driven `postAuthDestination`, so a
 * tenant user ALWAYS lands in their own tenant and NEVER falls through to the
 * platform/root app (see AUDIT.md §6 — the reset flow used a per-page redirect that
 * skipped membership and dropped tenant users at root).
 *
 * Ad-hoc per-page redirects to "/", root, or a hardcoded "/dashboard" are the bug
 * class this replaces: route every auth flow through here instead.
 */
import { postAuthDestination, type PostAuthDestination, type TenantChoice } from "@poolops/shared";
import { resolveUserMemberships } from "./user-tenant";

/**
 * The concrete URL for a resolved destination that maps to ONE location:
 *   • tenant   → `/<slug><role-landing>` (e.g. "/villas/dashboard")
 *   • platform → the platform dashboard
 * Returns null for `picker` (the user must choose) and `no-access` (a dead-end, not
 * a route) — callers handle those explicitly rather than guessing a tenant.
 */
export function postAuthUrl(dest: PostAuthDestination): string | null {
  switch (dest.kind) {
    case "tenant": return `/${dest.slug}${dest.path}`;
    case "platform": return "/dashboard";
    default: return null; // picker | no-access
  }
}

/** Enter a tenant with a HARD navigation (full document load), so the root layout
 *  re-runs under the tenant's path and seeds the tenant config — a soft nav would
 *  leave the client stuck on the platform config (AUDIT.md §6). */
export function hardNavigateTenant(choice: TenantChoice): void {
  window.location.assign(`/${choice.slug}${choice.path}`);
}

export interface PostAuthHandlers {
  /** Exactly one tenant membership → enter it. */
  onTenant: (choice: TenantChoice) => void;
  /** More than one tenant → let the user choose (never silently guess). */
  onPicker: (memberships: TenantChoice[]) => void;
  /** A platform/PoolOps Pro account → the platform context. */
  onPlatform: () => void;
  /** Authenticated but no tenant provisioned → a clear dead-end (never root). */
  onNoAccess: () => void | Promise<void>;
}

/**
 * Resolve the signed-in user's memberships and dispatch the routing decision to the
 * caller's handlers. Returns the resolved `PostAuthDestination` so callers can also
 * inspect it (e.g. for logging/UI copy). The session MUST already be established
 * (password set, magic link consumed, etc.) before calling this.
 */
export async function resolveTenantAndRedirect(
  userId: string,
  handlers: PostAuthHandlers,
): Promise<PostAuthDestination> {
  const memberships = await resolveUserMemberships(userId);
  const dest = postAuthDestination(memberships);
  switch (dest.kind) {
    case "tenant": handlers.onTenant(dest); break;
    case "picker": handlers.onPicker(dest.memberships); break;
    case "platform": handlers.onPlatform(); break;
    case "no-access": await handlers.onNoAccess(); break;
  }
  return dest;
}
