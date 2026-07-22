# Tenant branding assets

White-label rule: **a tenant's brand assets live in that tenant's config**, never
hardcoded globally. Other tenants supply their own — nothing here is Villas-specific
by default.

## What resolves the brand mark

`config.branding.icon` (see `packages/shared/src/tenant/schema.ts`) is the icon-only
mark used by the home button, favicon, apple-touch icon, and social card. It accepts:

- `"inline:<id>"` — a built-in vector mark from `packages/shared/src/tenant/brand-icons.ts`
  (e.g. `"inline:houses"`). Crisp at any size, inherits the theme color, transparent
  by nature. **Villas uses `inline:houses`** — no raster file needed.
- an asset URL (e.g. `"/branding/your-icon.svg"` or a PNG) for a tenant that ships art.

Other fields: `logoLight` / `logoDark` (full wordmark image), `ogImage` (static
1200×630 social image — if unset, one is generated per-tenant at `/api/og/<slug>`),
`appleTouchIcon`, `favicon`, `monogram` (fallback tile letters).

## Villas' assets here

- `villas-houses.svg` — the houses line-art mark as a standalone SVG (transparent,
  `currentColor`). Referenced implicitly via `inline:houses`; also usable directly as
  `branding.icon: "/branding/villas-houses.svg"` if you prefer the file over inline.

## Dropping in the real raster logo

If you have the original raster artwork (`villas-logo.png`): to use the **full
wordmark** in the app, add a transparent-background cutout as `villas-logo-transparent.png`
here and set Villas' `branding.logoLight` to `/branding/villas-logo-transparent.png`.
For a raster **icon**, crop to just the houses (no wordmark, transparent) and point
`branding.icon` at it. The inline SVG mark already covers the icon/favicon/OG cases,
so raster files are optional.
