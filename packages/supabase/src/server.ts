/**
 * Server-side Supabase client for Next.js App Router (RSC / route handlers).
 * Uses the cookie store so authenticated user sessions flow through SSR.
 * Uses the PUBLIC anon key — RLS enforces per-user access. Never the service role.
 *
 * Only import this from server components, server actions, or route handlers.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./config";
import type { Database } from "./types";

export function getServerSupabase() {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = cookies();
  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Called from a Server Component — safe to ignore; middleware refreshes.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          /* no-op */
        }
      },
    },
  });
}
