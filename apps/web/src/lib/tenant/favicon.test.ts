import { describe, it, expect } from "vitest";
import { PLATFORM_CONFIG, getTenantConfig } from "@poolops/shared";
import { faviconDataUri } from "./theme-css";

/**
 * The browser-tab favicon must follow the SAME brand as the page: the PoolOps Pro
 * platform tab shows the blue box + 3 waves, never a tenant's mark. (The favicon is
 * chosen from the resolved tenant config in tenantMetadata; this locks the platform
 * default so a tenant tile can't leak onto the marketing/landing tab.)
 */
describe("platform favicon", () => {
  const svg = decodeURIComponent(faviconDataUri(PLATFORM_CONFIG).replace("data:image/svg+xml,", ""));

  it("is the waves mark (inline paths), not a monogram", () => {
    expect(svg).toContain("<path");        // the waves glyph
    expect(svg).not.toContain("<text");    // NOT the "PO" monogram fallback
  });
  it("is a rounded brand-colored tile", () => {
    expect(svg).toMatch(/<rect[^>]*rx="14"/);      // rounded tile
    expect(svg).toMatch(/fill="#[0-9a-fA-F]{6}"/); // brand background
  });
});

describe("Villas favicon stays the Villas tile (tenant context only)", () => {
  it("uses the tenant's own favicon file, not the platform waves", () => {
    // Villas ships a real favicon file; that path wins in tenantMetadata. Here we just
    // assert the two configs are distinct so platform vs Villas can never collapse.
    expect(getTenantConfig("villas").branding.favicon).toBe("/branding/villas-favicon.png");
    expect(PLATFORM_CONFIG.branding.favicon).toBeUndefined();
  });
});
