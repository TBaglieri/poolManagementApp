"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase, getEffectiveDataMode, getDataMode, isSupabaseConfigured } from "@poolops/supabase";
import { isMissingTable } from "./db";

export type HealthStatus =
  | "mock"            // running on bundled demo data by choice
  | "unconfigured"    // supabase requested but env vars missing
  | "schema-missing"  // connected but tables not created yet
  | "connected"       // connected and schema present
  | "error";          // network / other failure

export interface Health {
  status: HealthStatus;
  message: string;
  checkedAt: string | null;
}

const LABEL: Record<HealthStatus, string> = {
  mock: "Local demo data",
  unconfigured: "Supabase not configured",
  "schema-missing": "Connected — schema not applied",
  connected: "Live sync (Supabase)",
  error: "Supabase unreachable",
};

export async function checkHealth(): Promise<Health> {
  const now = new Date().toISOString();
  if (getDataMode() !== "supabase") return { status: "mock", message: LABEL.mock, checkedAt: now };
  if (!isSupabaseConfigured()) return { status: "unconfigured", message: LABEL.unconfigured, checkedAt: now };
  const client = getBrowserSupabase();
  if (!client) return { status: "unconfigured", message: LABEL.unconfigured, checkedAt: now };
  try {
    const { error } = await client.from("organizations").select("id").limit(1);
    if (!error) return { status: "connected", message: LABEL.connected, checkedAt: now };
    if (isMissingTable(error)) return { status: "schema-missing", message: LABEL["schema-missing"], checkedAt: now };
    return { status: "error", message: error.message, checkedAt: now };
  } catch (e: any) {
    return { status: "error", message: e?.message ?? LABEL.error, checkedAt: now };
  }
}

export function useHealth(): Health {
  const [health, setHealth] = useState<Health>({
    status: getEffectiveDataMode() === "supabase" ? "connected" : "mock",
    message: "Checking…",
    checkedAt: null,
  });
  useEffect(() => {
    let active = true;
    checkHealth().then((h) => active && setHealth(h));
    return () => { active = false; };
  }, []);
  return health;
}

export function healthLabel(status: HealthStatus): string {
  return LABEL[status];
}
