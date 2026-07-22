/**
 * ⛔️ SERVICE-ROLE ADMIN CLIENT — SERVER ONLY. ⛔️
 *
 * This client uses SUPABASE_SERVICE_ROLE_KEY, which BYPASSES Row Level Security.
 * NEVER import this file in:
 *   - client components ("use client")
 *   - the mobile app
 *   - anything that ships to the browser
 *
 * Use it only inside trusted server code (route handlers, server actions, cron
 * jobs, webhooks) for privileged operations like provisioning organizations or
 * processing Stripe webhooks. The key must live ONLY in a git-ignored env file
 * or your hosting provider's secret store.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./config";
import type { Database } from "./types";

let _admin: SupabaseClient<Database> | null | undefined;

export function getAdminSupabase(): SupabaseClient<Database> | null {
  if (_admin !== undefined) return _admin;

  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    // Not configured — caller should handle null (e.g. respond 503) rather than crash.
    _admin = null;
    return null;
  }

  _admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
