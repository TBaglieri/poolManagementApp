// @ts-nocheck — resolved by Expo/Metro at runtime; AsyncStorage is a mobile-only dep.
/**
 * Mobile (Expo React Native) Supabase client.
 * Uses EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (public anon key).
 * Persists the auth session in AsyncStorage. Never imported by web code.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./config";

let _client = undefined;

export function getMobileSupabase() {
  if (_client !== undefined) return _client;
  if (!isSupabaseConfigured()) {
    _client = null;
    return null;
  }
  _client = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // not applicable in React Native
    },
  });
  return _client;
}
