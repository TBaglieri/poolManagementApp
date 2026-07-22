import { resolveThemeVars, rgbToHex, varsToCss, type TenantConfig } from "@poolops/shared";

/** The `:root { … }` CSS string of a tenant's theme tokens. Server + client share this. */
export function themeCss(config: TenantConfig): string {
  const { vars } = resolveThemeVars(config);
  return `:root{${varsToCss(vars)}}`;
}

/** Primary brand hex (brand-700) for meta theme-color / favicon. */
export function brandHex(config: TenantConfig, stop: 600 | 700 | 800 = 700): string {
  const { vars } = resolveThemeVars(config);
  const [r, g, b] = vars[`--brand-${stop}`].split(" ").map(Number);
  return rgbToHex([r, g, b]);
}

/** An inline SVG favicon (data URI) in the tenant's brand color + monogram. */
export function faviconDataUri(config: TenantConfig): string {
  const bg = brandHex(config, 700);
  const text = (config.branding.monogram || "P").slice(0, 2).toUpperCase();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${bg}"/>` +
    `<text x="50%" y="52%" dy="0.35em" text-anchor="middle" ` +
    `font-family="Inter,Arial,sans-serif" font-size="30" font-weight="700" fill="#ffffff">${text}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
