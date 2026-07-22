"use client";

/**
 * Data-access facade. Pages call these instead of importing tables directly,
 * so the source can switch between bundled demo data (mock mode) and Supabase
 * without touching feature code.
 *
 * In mock mode (or if a Supabase query fails) we return the bundled seed so the
 * UI is always populated. In supabase mode we read from Postgres via the browser
 * client (RLS-protected). Realtime subscriptions live in @poolops/supabase.
 */
import { getBrowserSupabase, getEffectiveDataMode } from "@poolops/supabase";
import {
  facilities as seedFacilities, staff as seedStaff, maintenanceIssues as seedIssues,
  chemicalLogs as seedChem, messages as seedMessages,
  type Facility, type StaffProfile, type MaintenanceIssue, type ChemicalLog, type Message,
} from "@poolops/shared";

async function withSupabase<T>(table: string, fallback: T[]): Promise<{ data: T[]; source: "supabase" | "mock" }> {
  if (getEffectiveDataMode() !== "supabase") return { data: fallback, source: "mock" };
  const client = getBrowserSupabase();
  if (!client) return { data: fallback, source: "mock" };
  try {
    const { data, error } = await client.from(table).select("*");
    if (error || !data || data.length === 0) return { data: fallback, source: "mock" };
    return { data: data as unknown as T[], source: "supabase" };
  } catch {
    return { data: fallback, source: "mock" };
  }
}

export const repo = {
  listFacilities: () => withSupabase<Facility>("facilities", seedFacilities),
  listStaff: () => withSupabase<StaffProfile>("staff_profiles", seedStaff),
  listMaintenance: () => withSupabase<MaintenanceIssue>("maintenance_issues", seedIssues),
  listChemicalLogs: () => withSupabase<ChemicalLog>("chemical_logs", seedChem),
  listMessages: () => withSupabase<Message>("messages", seedMessages),
};
