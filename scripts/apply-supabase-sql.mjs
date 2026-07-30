/**
 * Apply the PoolOps Pro SQL files to a Supabase project via the Management API.
 *
 * DDL (create table, policies, etc.) can't run through the anon/service REST keys,
 * so this uses the Management API, which needs a Personal Access Token.
 *
 * Usage (token read from env — never pass it on the command line / commit it):
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx SUPABASE_PROJECT_REF=bqhhbekmqsmfkxyzdvol \
 *     node scripts/apply-supabase-sql.mjs
 *
 * Create a token at: https://supabase.com/dashboard/account/tokens
 * Revoke it right after if you like — it's only needed for this one run.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { filesFor } from "../supabase/manifest.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_DIR = resolve(__dirname, "../supabase");

// Flags: --with-seed adds the sample/tenant data; --verify runs the read-only check.
const withSeed = process.argv.includes("--with-seed");
const verify = process.argv.includes("--verify");
const FILES = filesFor({ withSeed, verify }).map((m) => m.file);

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF || "bqhhbekmqsmfkxyzdvol";

if (!TOKEN) {
  console.error("✗ Set SUPABASE_ACCESS_TOKEN (a personal access token from");
  console.error("  https://supabase.com/dashboard/account/tokens) and re-run.");
  console.error("  Add --with-seed to also load sample/tenant data; --verify to check setup.");
  process.exit(1);
}

const ENDPOINT = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function runSql(label, sql) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${label}: HTTP ${res.status} — ${text.slice(0, 600)}`);
  }
  return text;
}

(async () => {
  console.log(`Applying ${FILES.length} SQL files to project ${REF}${withSeed ? " (with seed data)" : ""} …\n`);
  for (const file of FILES) {
    const sql = readFileSync(resolve(SQL_DIR, file), "utf8");
    process.stdout.write(`→ ${file.padEnd(34)} `);
    try {
      await runSql(file, sql);
      console.log("✓ applied");
    } catch (e) {
      console.log("✗ FAILED");
      console.error(`\n${e.message}\n`);
      process.exit(1);
    }
  }
  console.log("\n✅ All SQL applied. Schema, auth, RLS, storage, realtime, tenant config, and team chat are live.");
  if (!withSeed) console.log("   (Re-run with --with-seed to load sample/tenant data.)");
})();
