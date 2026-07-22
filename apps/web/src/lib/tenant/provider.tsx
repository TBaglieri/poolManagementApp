"use client";

/**
 * Client tenant context. The server layout resolves the active tenant config and
 * passes it in as `initialConfig`; this provider layers any admin edits on top:
 *
 *   • savedOverride   — persisted admin edits (localStorage), applied everywhere.
 *   • previewOverride  — transient edits from the admin "theme preview" (not saved
 *                        until you click Save; discarding restores the saved state).
 *
 * `useFeature`, `useModuleEnabled`, and `useRoleLabel` read from the resolved config
 * so the whole app (nav, routes, labels, theme) reflects the active tenant live.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  TenantConfigSchema, deepMerge, isFeatureEnabled, isModuleEnabled,
  resolveRoleLabel, resolveRoleShortLabel,
  type TenantConfig, type DeepPartial, type ModuleId, type RoleSlug,
} from "@poolops/shared";

type Override = DeepPartial<TenantConfig>;

interface TenantContextValue {
  config: TenantConfig;
  slug: string;
  /** Persisted admin override for this tenant, if any. */
  savedOverride: Override | null;
  /** Merge + persist admin edits (applied app-wide). */
  save: (override: Override | null) => void;
  /** Live preview without persisting (admin theme preview). */
  setPreview: (override: Override | null) => void;
  /** Drop the transient preview, back to the saved state. */
  discardPreview: () => void;
  /** Remove all overrides for this tenant (reset to config defaults). */
  reset: () => void;
  isPreviewing: boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

const keyFor = (slug: string) => `poolops-tenant-override:${slug}`;

function readSaved(slug: string): Override | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(slug));
    return raw ? (JSON.parse(raw) as Override) : null;
  } catch {
    return null;
  }
}

function merge(base: TenantConfig, override: Override | null): TenantConfig {
  if (!override) return base;
  try {
    return TenantConfigSchema.parse(deepMerge(base, override));
  } catch {
    return base; // never render a broken config; admin UI surfaces the error separately
  }
}

export function TenantProvider({
  slug, initialConfig, children,
}: {
  slug: string;
  initialConfig: TenantConfig;
  children: React.ReactNode;
}) {
  const [savedOverride, setSavedOverride] = useState<Override | null>(null);
  const [previewOverride, setPreviewOverride] = useState<Override | null>(null);

  // Load any persisted admin edits after mount (avoids SSR/client mismatch).
  useEffect(() => {
    setSavedOverride(readSaved(slug));
  }, [slug]);

  const effectiveOverride = previewOverride ?? savedOverride;
  const config = useMemo(() => merge(initialConfig, effectiveOverride), [initialConfig, effectiveOverride]);

  const save = useCallback((override: Override | null) => {
    setSavedOverride(override);
    setPreviewOverride(null);
    try {
      if (override) window.localStorage.setItem(keyFor(slug), JSON.stringify(override));
      else window.localStorage.removeItem(keyFor(slug));
    } catch { /* storage unavailable — keep in-memory */ }
  }, [slug]);

  const value: TenantContextValue = {
    config,
    slug,
    savedOverride,
    save,
    setPreview: setPreviewOverride,
    discardPreview: () => setPreviewOverride(null),
    reset: () => save(null),
    isPreviewing: previewOverride !== null,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within a TenantProvider");
  return ctx;
}

/** The resolved tenant config (identity, branding, copy, operations). */
export function useTenantConfig(): TenantConfig {
  return useTenant().config;
}

/** Is a module (and optional sub-feature) enabled for the active tenant? */
export function useFeature(module: ModuleId, subFeature?: string): boolean {
  const { config } = useTenant();
  return isFeatureEnabled(config, module, subFeature);
}

export function useModuleEnabled(module: ModuleId): boolean {
  const { config } = useTenant();
  return isModuleEnabled(config, module);
}

/** Tenant-aware role display label (full). */
export function useRoleLabel(slug: RoleSlug | null | undefined): string {
  const { config } = useTenant();
  return slug ? resolveRoleLabel(config, slug) : "";
}

/** Tenant-aware role display label (short, for sidebar/badges). */
export function useRoleShortLabel(slug: RoleSlug | null | undefined): string {
  const { config } = useTenant();
  return slug ? resolveRoleShortLabel(config, slug) : "";
}
