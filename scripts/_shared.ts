/**
 * Shared helpers for the ops scripts (seed-villas, create-admin).
 * Loads env from the repo-root .env.local (no extra deps), validates required
 * secrets, and builds a service-role Supabase client. Secrets come ONLY from the
 * environment — never hardcode them.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Load .env.local / .env from the repo root into process.env (existing values win). */
export function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const p = resolve(ROOT, file);
    if (!existsSync(p)) continue;
    for (const raw of readFileSync(p, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

/** Exit with a clear message if any required env var is missing. */
export function requireEnv(names: string[]): Record<string, string> {
  loadEnv();
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`\n✖ Missing required environment variable(s): ${missing.join(", ")}`);
    console.error(`  Set them in .env.local (local) or the Vercel project settings — see .env.example.\n`);
    process.exit(1);
  }
  return Object.fromEntries(names.map((n) => [n, process.env[n]!]));
}

/** Service-role Supabase client (bypasses RLS — server/CLI only). */
export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Parse `--key=value` / `--key value` CLI args plus positionals. */
export function parseArgs(argv: string[]): { flags: Record<string, string>; positionals: string[] } {
  const flags: Record<string, string> = {};
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else if (argv[i + 1] && !argv[i + 1].startsWith("--")) flags[a.slice(2)] = argv[++i];
      else flags[a.slice(2)] = "true";
    } else positionals.push(a);
  }
  return { flags, positionals };
}
