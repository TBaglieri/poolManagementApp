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
