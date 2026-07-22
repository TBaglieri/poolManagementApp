"use client";

/**
 * Low-level data-access helpers shared by every repository.
 *
 * Repositories call these so feature code never talks to Supabase directly and
 * always degrades gracefully: in mock mode (or on any Supabase error / missing
 * table) they fall back to bundled demo data and report the source + error.
 */
import { getBrowserSupabase, getEffectiveDataMode } from "@poolops/supabase";

export type DataSource = "supabase" | "mock";

export interface RepoResult<T> {
  data: T;
  source: DataSource;
  error: string | null;
}

export function activeMode(): DataSource {
  return getEffectiveDataMode();
}

export function db() {
  return getBrowserSupabase();
}

/** PostgREST "table not found" — schema not applied yet. */
export function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST205" || /Could not find the table/i.test(error.message ?? "");
}

/**
 * Run a Supabase SELECT, mapping rows to app types. Falls back to `mock` on any
 * error (including a missing table) so the UI is never broken.
 */
export async function selectOr<TRow, TOut>(
  table: string,
  mock: TOut[],
  map: (row: TRow) => TOut,
  build?: (q: any) => any,
): Promise<RepoResult<TOut[]>> {
  if (activeMode() !== "supabase") return { data: mock, source: "mock", error: null };
  const client = db();
  if (!client) return { data: mock, source: "mock", error: "Supabase not configured" };
  try {
    let q: any = client.from(table).select("*");
    if (build) q = build(q);
    const { data, error } = await q;
    if (error) {
      return { data: mock, source: "mock", error: isMissingTable(error) ? `Table "${table}" not found — run supabase/schema.sql` : error.message };
    }
    return { data: (data ?? []).map(map as any), source: "supabase", error: null };
  } catch (e: any) {
    return { data: mock, source: "mock", error: e?.message ?? "Supabase query failed" };
  }
}

/** Run a Supabase INSERT. Returns the inserted row mapped, or an error. */
export async function insertOr<TOut>(
  table: string,
  payload: Record<string, unknown>,
  map?: (row: any) => TOut,
): Promise<{ ok: boolean; source: DataSource; error: string | null; data: TOut | null }> {
  if (activeMode() !== "supabase") return { ok: true, source: "mock", error: null, data: null };
  const client = db();
  if (!client) return { ok: false, source: "mock", error: "Supabase not configured", data: null };
  try {
    const { data, error } = await client.from(table).insert(payload as any).select().single();
    if (error) {
      return { ok: false, source: "supabase", error: isMissingTable(error) ? `Table "${table}" not found — run supabase/schema.sql` : error.message, data: null };
    }
    return { ok: true, source: "supabase", error: null, data: map && data ? map(data) : (data as TOut) };
  } catch (e: any) {
    return { ok: false, source: "supabase", error: e?.message ?? "Insert failed", data: null };
  }
}
