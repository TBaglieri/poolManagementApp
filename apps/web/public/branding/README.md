# Tenant branding assets

White-label rule: **a tenant's brand assets live in that tenant's config**
(`packages/shared/src/tenant/registry.ts` → `branding`), never hardcoded globally.
Other tenants supply their own — nothing here is loaded unless a tenant points at it.

## Villas on the Ridge assets

Derived from the supplied townhouse line-art logo. The source lockup's "Community
Icon" placeholder text was cropped off; a transparent cutout + an icon-only crop +
white (dark-mode) variants were generated (see `scripts/`-style Pillow steps noted in
AUDIT.md §4f).

| File | Purpose | Config field |
|------|---------|--------------|
| `villas-logo.png` | Full lockup (houses + wordmark), dark slate, transparent | `logoLight` |
| `villas-logo-light.png` | White lockup for dark surfaces | `logoDark` |
| `villas-icon.png` | Houses-only mark, dark slate, transparent | `icon` |
| `villas-icon-light.png` | White houses-only mark (dark mode) | `iconDark` |
| `villas-favicon.png` | 64×64 white houses on a brand-teal tile | `favicon` |
| `villas-touch.png` | 180×180 apple-touch icon (same design) | `appleTouchIcon` |
| `villas-og.png` | 1200×630 social preview card | `ogImage` |

## How the mark resolves

`config.branding.icon` (see `schema.ts`) is the icon-only mark used by the home
button. It accepts a raster/vector URL (Villas → `villas-icon.png`, theme-swapped to
`iconDark` on dark chrome) OR an `"inline:<id>"` reference to a built-in vector mark
in `packages/shared/src/tenant/brand-icons.ts` (crisp + theme-colored, no files
needed) for a tenant that has none of its own. `favicon`/`appleTouchIcon`/`ogImage`
fall back to a generated brand-color mark / the `/api/og/<slug>` card when unset, so
every tenant is on-brand out of the box.

## Regenerating Villas' derived assets

If the source logo changes, re-run the Pillow derivation (bands: houses / wordmark /
drop the "Community Icon" line) documented in AUDIT.md §4f to refresh the cutouts,
white variants, favicon tile and OG card.
