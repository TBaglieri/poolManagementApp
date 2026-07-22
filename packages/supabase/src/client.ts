import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/** Generic factory used by the browser and mobile clients. */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: Parameters<typeof createClient>[2],
): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, options);
}

export type { SupabaseClient };
