/**
 * Mobile Supabase client + data-mode detection.
 *
 * Uses the PUBLIC anon key from EXPO_PUBLIC_* env. Never embed the service role
 * key in the mobile bundle. Session persists via AsyncStorage.
 */
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const MODE = (process.env.EXPO_PUBLIC_DATA_MODE ?? "mock").toLowerCase();

export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON && URL.startsWith("http"));
}

export type DataMode = "mock" | "supabase";

export function getDataMode(): DataMode {
  return MODE === "supabase" ? "supabase" : "mock";
}

export function getEffectiveDataMode(): DataMode {
  return getDataMode() === "supabase" && isSupabaseConfigured() ? "supabase" : "mock";
}

let _client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  if (!isSupabaseConfigured()) {
    _client = null;
    return null;
  }
  _client = createClient(URL, ANON, {
    auth: {
      storage: AsyncStorage as never,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return _client;
}
