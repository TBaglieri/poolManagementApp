/**
 * Feature-flag resolution against a tenant config. Same source of truth on the
 * server and client.
 */
import type { TenantConfig } from "./schema";
import { MODULE_BY_ID, MODULES, moduleForPath, type AppModule, type ModuleId } from "./modules";

/** Is a module turned on for this tenant? Core modules are always on. */
export function isModuleEnabled(config: TenantConfig, id: ModuleId): boolean {
  const m = MODULE_BY_ID[id];
  if (m?.core) return true;
  return config.features[id] === true;
}

/** Is a module (and optional sub-feature) enabled? Sub-features default to on. */
export function isFeatureEnabled(config: TenantConfig, id: ModuleId, subId?: string): boolean {
  if (!isModuleEnabled(config, id)) return false;
  if (!subId) return true;
  return config.subFeatures[`${id}.${subId}`] !== false;
}

/** Modules enabled for this tenant, in registry order. */
export function enabledModules(config: TenantConfig): AppModule[] {
  return MODULES.filter((m) => isModuleEnabled(config, m.id));
}

/**
 * Server + client route gate: is this pathname allowed for the tenant?
 * A path not owned by any module (marketing, auth, api) is always allowed.
 */
export function isPathEnabled(config: TenantConfig, pathname: string): boolean {
  const m = moduleForPath(pathname);
  return m ? isModuleEnabled(config, m.id) : true;
}
