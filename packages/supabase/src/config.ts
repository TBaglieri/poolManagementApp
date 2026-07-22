/**
 * Environment + data-mode configuration shared by web (Next) and mobile (Expo).
 *
 * IMPORTANT: env vars must be referenced as *literals* (not dynamic keys) so the
 * Next/Expo bundlers can inline the public values into client bundles. The "other"
 * platform's vars are simply `undefined` and we fall back gracefully.
 *
 * Only the PUBLIC (publishable / anon) key is ever read here. The service-role
 * secret is read exclusively in `admin.ts` (server-only) — never in this file.
 */

// Next.js public env (web)
const NEXT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const NEXT_MODE = process.env.NEXT_PUBLIC_DATA_MODE;

// Expo public env (mobile)
const EXPO_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const EXPO_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const EXPO_MODE = process.env.EXPO_PUBLIC_DATA_MODE;

export type DataMode = "mock" | "supabase";

export function getSupabaseUrl(): string {
  return (NEXT_URL || EXPO_URL || "").trim();
}

export function getSupabaseAnonKey(): string {
  return (NEXT_ANON || EXPO_ANON || "").trim();
}

/**
 * Requested data mode. Explicit env wins (`NEXT_PUBLIC_DATA_MODE` = `supabase` or
 * `mock`). When UNSET, we default to `supabase` **if Supabase is actually configured**
 * (URL + anon key present) and `mock` otherwise. This makes real auth the default for
 * any real deployment — demo/mock is never the silent global default that overrides a
 * real signed-in user. A zero-backend build still runs in mock so the demo works.
 */
export function getDataMode(): DataMode {
  const raw = (NEXT_MODE || EXPO_MODE || "").trim().toLowerCase();
  if (raw === "supabase") return "supabase";
  if (raw === "mock") return "mock";
  return isSupabaseConfigured() ? "supabase" : "mock";
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(url && key && url.startsWith("http"));
}

/**
 * Effective mode the app should actually run in: supabase only if requested AND
 * properly configured, otherwise mock. Pages can call this to decide behavior.
 */
export function getEffectiveDataMode(): DataMode {
  return getDataMode() === "supabase" && isSupabaseConfigured() ? "supabase" : "mock";
}

export type SyncStatus = "local-demo" | "supabase-connected" | "supabase-unconfigured";

export function getSyncStatus(): SyncStatus {
  if (getDataMode() === "mock") return "local-demo";
  return isSupabaseConfigured() ? "supabase-connected" : "supabase-unconfigured";
}

export const SUPABASE_PUBLIC_CONFIG = {
  url: getSupabaseUrl(),
  anonKey: getSupabaseAnonKey(),
  mode: getDataMode(),
};
