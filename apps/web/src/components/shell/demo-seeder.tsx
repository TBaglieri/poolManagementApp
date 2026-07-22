"use client";

import { useEffect } from "react";
import { isDemoTenant } from "@poolops/shared";
import { useTenantConfig } from "@/lib/tenant/provider";
import { useDemo } from "@/lib/store";

/**
 * Loads the bundled demo dataset into the store ONLY for the gated demo tenant.
 * Real tenants keep every store slice empty, so no demo/sample data ever renders
 * in a real facility's views.
 */
export function DemoSeeder() {
  const config = useTenantConfig();
  const seedDemo = useDemo((s) => s.seedDemo);
  useEffect(() => {
    if (isDemoTenant(config)) seedDemo();
  }, [config, seedDemo]);
  return null;
}
