import { describe, it, expect } from "vitest";
import { getTenantConfig, PLATFORM_CONFIG } from "@poolops/shared";
import { tenantMetadata } from "./metadata";

const ORIGIN = "https://pools.example.com";

describe("platform vs tenant link previews", () => {
  it("platform metadata is PoolOps Pro at the site root — not a tenant", () => {
    const meta = tenantMetadata(PLATFORM_CONFIG, { origin: ORIGIN, slug: "platform" });
    expect(meta.openGraph?.title).toBe("PoolOps Pro");
    expect(meta.openGraph?.title).not.toBe("Villas on the Ridge");
    expect((meta.openGraph as any)?.url).toBe(ORIGIN); // root, not /platform
    expect((meta.openGraph as any)?.images?.[0]?.url).toBe(`${ORIGIN}/api/og/platform`);
  });

  it("a tenant URL still unfurls with the tenant's brand", () => {
    const meta = tenantMetadata(getTenantConfig("villas"), { origin: ORIGIN, slug: "villas" });
    expect(meta.openGraph?.title).toBe("Villas on the Ridge");
    expect((meta.openGraph as any)?.url).toBe(`${ORIGIN}/villas`);
  });
});

describe("tenantMetadata — per-tenant link previews", () => {
  it("resolves Open Graph + Twitter from the Villas config", () => {
    const meta = tenantMetadata(getTenantConfig("villas"), { origin: ORIGIN, slug: "villas" });
    expect(meta.openGraph?.title).toBe("Villas on the Ridge");
    expect(meta.openGraph?.description).toBe("Your community pool, run smoothly.");
    expect((meta.openGraph as any)?.url).toBe(`${ORIGIN}/villas`);
    expect((meta.twitter as any)?.card).toBe("summary_large_image");
    // Villas ships a static social card.
    const img = (meta.openGraph as any)?.images?.[0]?.url;
    expect(img).toBe(`${ORIGIN}/branding/villas-og.png`);
  });

  it("a SECOND tenant renders its OWN branding + generated card, never Villas'", () => {
    const meta = tenantMetadata(getTenantConfig("tidetown"), { origin: ORIGIN, slug: "tidetown" });
    expect(meta.openGraph?.title).toBe("Tide & Town Aquatics");
    expect(meta.openGraph?.title).not.toBe("Villas on the Ridge");
    // No static ogImage → the per-tenant generated card route.
    expect((meta.openGraph as any)?.images?.[0]?.url).toBe(`${ORIGIN}/api/og/tidetown`);
    expect((meta.openGraph as any)?.url).toBe(`${ORIGIN}/tidetown`);
  });

  it("prefers a tenant-supplied static ogImage when set", () => {
    const base = getTenantConfig("villas");
    const withImage = { ...base, branding: { ...base.branding, ogImage: "/branding/villas-card.png" } };
    const meta = tenantMetadata(withImage, { origin: ORIGIN, slug: "villas" });
    expect((meta.openGraph as any)?.images?.[0]?.url).toBe(`${ORIGIN}/branding/villas-card.png`);
  });

  it("uses the tenant's favicon + apple-touch files when set (Villas)", () => {
    const meta = tenantMetadata(getTenantConfig("villas"), { origin: ORIGIN, slug: "villas" });
    expect((meta.icons as any)?.icon).toBe(`${ORIGIN}/branding/villas-favicon.png`);
    expect((meta.icons as any)?.apple).toBe(`${ORIGIN}/branding/villas-touch.png`);
  });

  it("falls back to a generated brand-color favicon when a tenant sets none", () => {
    const base = getTenantConfig("villas");
    const noFiles = { ...base, branding: { ...base.branding, favicon: undefined, appleTouchIcon: undefined } };
    const meta = tenantMetadata(noFiles, { origin: ORIGIN, slug: "villas" });
    expect((meta.icons as any)?.icon).toContain("data:image/svg+xml");
  });
});
