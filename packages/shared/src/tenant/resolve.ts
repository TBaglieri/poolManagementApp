/**
 * Tenant config resolution: deep-merge a tenant partial onto the defaults,
 * validate the result, and turn the resolved theme into CSS custom properties.
 */
import { TenantConfigSchema, type TenantConfig, type DeepPartial } from "./schema";
import { DEFAULT_TENANT_CONFIG } from "./defaults";
import {
  buildScale, ensureAccessible, hexToRgb, scaleToVars, type ColorScale, type ThemeVars,
  type ContrastCheck, STOPS,
} from "./theme";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Recursively merge `override` onto `base`. Arrays/tuples replace wholesale. */
export function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override === undefined ? base : (override as T));
  }
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v === undefined) continue;
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? deepMerge(out[k], v) : v;
  }
  return out as T;
}

/** Merge a tenant partial onto the defaults and validate. Throws on malformed config. */
export function resolveTenantConfig(input: DeepPartial<TenantConfig>): TenantConfig {
  const merged = deepMerge(DEFAULT_TENANT_CONFIG, input);
  return TenantConfigSchema.parse(merged);
}

/** Non-throwing variant for the admin UI. */
export function safeResolveTenantConfig(
  input: DeepPartial<TenantConfig>,
): { config: TenantConfig | null; error: string | null } {
  try {
    return { config: resolveTenantConfig(input), error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid tenant configuration";
    return { config: null, error: msg };
  }
}

const RADIUS_VARS: Record<TenantConfig["theme"]["radius"], ThemeVars> = {
  sharp: { "--radius-lg": "0.25rem", "--radius-xl": "0.375rem", "--radius-2xl": "0.5rem" },
  soft: { "--radius-lg": "0.5rem", "--radius-xl": "0.875rem", "--radius-2xl": "1.125rem" },
  round: { "--radius-lg": "0.75rem", "--radius-xl": "1.125rem", "--radius-2xl": "1.5rem" },
};

/** Build a full scale from a base hex plus optional per-stop hex overrides. */
function scaleFrom(baseHex: string, override?: Record<string, string>): ColorScale {
  const scale = buildScale(baseHex);
  if (override) {
    for (const stop of STOPS) {
      const hex = override[String(stop)];
      if (hex) scale[stop] = hexToRgb(hex);
    }
  }
  return scale;
}

export interface ResolvedTheme {
  vars: ThemeVars;
  checks: ContrastCheck[];
  warnings: string[];
}

/**
 * Resolve a config's theme to the CSS variables Tailwind reads, guaranteeing the
 * brand scale passes WCAG AA (auto-adjusting and reporting warnings if not).
 */
export function resolveThemeVars(config: TenantConfig): ResolvedTheme {
  const t = config.theme;
  const brandRaw = scaleFrom(t.brand, t.brandScale);
  const { scale: brand, checks, warnings } = ensureAccessible(brandRaw);
  const navy = scaleFrom(t.secondary, t.navyScale);

  const vars: ThemeVars = {
    ...scaleToVars("brand", brand),
    ...scaleToVars("navy", navy),
    ...RADIUS_VARS[t.radius],
    "--font-brand": config.branding.fontFamily,
    ...t.customVars,
  };
  return { vars, checks, warnings };
}
