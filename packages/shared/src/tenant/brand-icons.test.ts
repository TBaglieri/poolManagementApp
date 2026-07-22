import { describe, it, expect } from "vitest";
import { inlineIconId, inlineIconSvg, INLINE_ICONS } from "./brand-icons";
import { getTenantConfig } from "./registry";

describe("inline brand icons", () => {
  it("resolves a valid inline reference to its id", () => {
    expect(inlineIconId("inline:houses")).toBe("houses");
  });

  it("rejects unknown ids, asset URLs, and blanks", () => {
    expect(inlineIconId("inline:spaceship")).toBeNull();
    expect(inlineIconId("/branding/villas-houses.svg")).toBeNull();
    expect(inlineIconId(undefined)).toBeNull();
    expect(inlineIconId(null)).toBeNull();
  });

  it("serializes an icon to a self-contained SVG string", () => {
    const svg = inlineIconSvg("houses", { color: "#fff", stroke: 3, size: 48 });
    expect(svg).toContain("<svg");
    expect(svg).toContain(INLINE_ICONS.houses.viewBox);
    expect(svg).toContain('stroke="#fff"');
    expect((svg.match(/<path /g) ?? []).length).toBe(INLINE_ICONS.houses.paths.length);
  });

  it("Villas points its icon at its own raster cutout (white-label: per-tenant asset)", () => {
    const icon = getTenantConfig("villas").branding.icon;
    expect(icon).toBe("/branding/villas-icon.png");
    // It's a real asset, not an inline mark.
    expect(inlineIconId(icon)).toBeNull();
  });
});
