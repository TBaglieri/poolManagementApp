import { createSupabaseClient, type SupabaseClient } from "./client";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./config";
import type { Database } from "./types";

/**
 * Browser/client Supabase singleton (web + can be reused on mobile).
 * Uses ONLY the public anon/publishable key. Safe to import in client code.
 * Returns `null` if Supabase isn't configured so the app can fall back to mock
 * mode instead of crashing.
 */
let _client: SupabaseClient<Database> | null | undefined;

export function getBrowserSupabase(): SupabaseClient<Database> | null {
  if (_client !== undefined) return _client;
  if (!isSupabaseConfigured()) {
    _client = null;
    return null;
  }
  _client = createSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}
