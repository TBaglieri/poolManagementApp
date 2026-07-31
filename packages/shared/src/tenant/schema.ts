/**
 * Typed tenant configuration schema (Zod).
 *
 * A tenant config is the single source of truth for a tenant's identity,
 * branding, copy, feature flags, operational settings, theme, and role labels.
 * The RESOLVED config (a tenant partial deep-merged onto `DEFAULT_TENANT_CONFIG`)
 * is validated with `TenantConfigSchema.parse`, so a malformed config fails loudly
 * at load rather than silently at render.
 */
import { z } from "zod";

export const HexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a hex color like #0E7490");

const Range = z.tuple([z.number(), z.number()]);

export const OrganizationTypeEnum = z.enum([
  "community_pool", "swim_club", "municipality", "camp", "school", "private_aquatics_center",
]);

/** Optional per-stop hex overrides, e.g. { "700": "#0E7490" }. */
const ScaleOverride = z.record(z.string(), HexColor).optional();

export const ThemeSchema = z.object({
  /** Brand inputs — a full accessible scale is derived from these. */
  brand: HexColor,
  secondary: HexColor,
  accent: HexColor,
  neutral: z.enum(["slate", "zinc", "gray"]),
  radius: z.enum(["sharp", "soft", "round"]),
  density: z.enum(["comfortable", "compact"]),
  defaultScheme: z.enum(["light", "dark", "system"]),
  allowUserScheme: z.boolean(),
  /** Explicit per-stop overrides (platform default uses these to stay pixel-identical). */
  brandScale: ScaleOverride,
  navyScale: ScaleOverride,
  /** Escape hatch: arbitrary CSS custom properties injected at :root. */
  customVars: z.record(z.string(), z.string()),
});

export const BrandingSchema = z.object({
  logoLight: z.string().optional(),
  logoDark: z.string().optional(),
  favicon: z.string().optional(),
  heroImage: z.string().optional(),
  /**
   * The compact, icon-only brand mark (no wordmark) used for the home button,
   * favicon and touch icon. Either an asset URL (e.g. "/branding/villas-houses.svg")
   * or an inline reference "inline:<id>" (e.g. "inline:houses") that renders a
   * crisp, theme-colored SVG at any size. Per-tenant — each tenant sets its own.
   */
  icon: z.string().optional(),
  /** Dark-mode variant of `icon` (e.g. a light/white cutout) when the icon is a
   *  fixed-color asset that wouldn't read on dark chrome. Optional. */
  iconDark: z.string().optional(),
  /** Social preview image (~1200×630) for link unfurls; generated per-tenant if unset. */
  ogImage: z.string().optional(),
  /** apple-touch-icon; falls back to the icon/generated mark when unset. */
  appleTouchIcon: z.string().optional(),
  fontFamily: z.string(),
  /** Short letters for the generated logo mark when no image is set. */
  monogram: z.string().min(1).max(3),
});

export const CopySchema = z.object({
  tagline: z.string(),
  welcome: z.string(),
  rules: z.string(),
  emailFooter: z.string(),
  notificationSender: z.string(),
});

export const OperationsSchema = z.object({
  poolHours: z.string(),
  seasonStart: z.string(),
  seasonEnd: z.string(),
  maxGuestsPerMember: z.number().int().nonnegative(),
  reservationSlotMinutes: z.number().int().positive(),
  chemicalUnit: z.string(),
  /**
   * Expected water-chemistry readings per day for THIS tenant (0/undefined = no
   * target). Drives the "N of M readings today" hint — NEVER hardcode a count in
   * shared code. Villas sets 3; another pool may set 1, 5, or leave it unset.
   */
  expectedReadingsPerDay: z.number().int().nonnegative().optional(),
  /**
   * Which chemical fields THIS tenant records, by key (see CHEMICAL_FIELDS). When
   * unset, the tenant gets the full panel — so existing tenants are unchanged and a
   * future customer can always switch every field back on via config, no new code.
   * Villas records only ["freeChlorine", "ph"].
   */
  chemicalFields: z
    .array(z.enum(["freeChlorine", "combinedChlorine", "ph", "alkalinity", "calciumHardness", "cyanuricAcid", "waterTemp"]))
    .min(1)
    .optional(),
  /**
   * Max facilities this tenant may create. Unset/0 = unlimited (the default, so
   * multi-facility tenants are unchanged). Villas is a single community pool → 1:
   * the "Add facility" button hides at the limit and the backend rejects the insert
   * (see supabase/facility-limit.sql). NEVER hardcode this — it's per-tenant config.
   */
  maxFacilities: z.number().int().positive().optional(),
  chemicalRanges: z.object({
    freeChlorine: Range,
    combinedChlorine: Range,
    ph: Range,
    alkalinity: Range,
    calciumHardness: Range,
    cyanuricAcid: Range,
    waterTemp: Range,
  }),
});

export const TenantConfigSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
  displayName: z.string().min(1),
  legalName: z.string(),
  /** White-label in-app product name (platform default: "PoolOps Pro"). */
  productName: z.string().min(1),
  organizationType: OrganizationTypeEnum,
  address: z.string(),
  timezone: z.string(),
  contact: z.object({
    email: z.string(),
    phone: z.string(),
  }),
  branding: BrandingSchema,
  theme: ThemeSchema,
  copy: CopySchema,
  /** module id → enabled. */
  features: z.record(z.string(), z.boolean()),
  /** "moduleId.subId" → enabled. */
  subFeatures: z.record(z.string(), z.boolean()),
  /** roleSlug → custom display label. */
  roleLabels: z.record(z.string(), z.string()),
  /** Which base roles this tenant enables (super_admin is always available to the platform owner). */
  activeRoles: z.array(z.string()).min(1),
  operations: OperationsSchema,
});

export type TenantConfig = z.infer<typeof TenantConfigSchema>;
export type TenantTheme = z.infer<typeof ThemeSchema>;

/** Deeply-optional shape for a tenant partial that merges onto the defaults. */
export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
export type TenantConfigInput = DeepPartial<TenantConfig> & { slug: string; displayName: string };
