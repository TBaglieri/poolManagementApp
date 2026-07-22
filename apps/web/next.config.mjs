import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Load env from the monorepo ROOT (and apps/web) so a `.env.local` placed in the
 * project's top-level folder is picked up even though Next runs in apps/web.
 * Next only auto-loads env files from its own directory; this bridges the gap.
 * Existing process.env values always win (never override real/CI env).
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

// Precedence: process.env > apps/web/.env.local > root .env.local > root .env
loadEnvFile(resolve(__dirname, ".env.local"));
loadEnvFile(resolve(root, ".env.local"));
loadEnvFile(resolve(root, ".env"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile the shared workspace packages (TypeScript source) on the fly.
  transpilePackages: ["@poolops/shared", "@poolops/scheduling", "@poolops/supabase"],
  eslint: { ignoreDuringBuilds: true },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    NEXT_PUBLIC_DATA_MODE: process.env.NEXT_PUBLIC_DATA_MODE ?? "mock",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  },
};

export default nextConfig;
