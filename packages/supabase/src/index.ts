/**
 * Public entry for @poolops/supabase.
 * NOTE: server.ts (next/headers), admin.ts (service role), and mobile.ts
 * (AsyncStorage) are intentionally NOT re-exported here — import them via their
 * subpaths only, from the appropriate environment.
 */
export * from "./config";
export * from "./client";
export * from "./browser";
export * from "./realtime";
export type { Database, Json } from "./types";
