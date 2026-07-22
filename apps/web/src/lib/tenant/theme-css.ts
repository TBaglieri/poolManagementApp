import { resolveThemeVars, rgbToHex, varsToCss, inlineIconId, INLINE_ICONS, type TenantConfig } from "@poolops/shared";

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

/**
 * An inline SVG favicon (data URI) on a rounded tile in the tenant's brand color.
 * Uses the tenant's icon-only mark (the same houses line-art shown on the home
 * button) when it has an inline icon, so the browser tab matches the home button
 * and link-preview card; otherwise falls back to the monogram.
 */
export function faviconDataUri(config: TenantConfig): string {
  const bg = brandHex(config, 700);
  const inline = inlineIconId(config.branding.icon);
  let inner: string;
  if (inline) {
    const def = INLINE_ICONS[inline];
    const paths = def.paths.map((d) => `<path d="${d}"/>`).join("");
    // Center the mark's viewBox (0 0 64 44) inside the 64×64 tile with padding.
    inner =
      `<g transform="translate(6 12) scale(0.81)" fill="none" stroke="#ffffff" ` +
      `stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${paths}</g>`;
  } else {
    const text = (config.branding.monogram || "P").slice(0, 2).toUpperCase();
    inner =
      `<text x="50%" y="52%" dy="0.35em" text-anchor="middle" ` +
      `font-family="Inter,Arial,sans-serif" font-size="30" font-weight="700" fill="#ffffff">${text}</text>`;
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${bg}"/>${inner}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
