import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getTenantConfig } from "./registry";
import { isModuleEnabled } from "./flags";

/**
 * Data-isolation guard. A live cross-tenant integration test needs two seeded orgs
 * and service credentials (provided as supabase/tenant-isolation.test.sql for CI);
 * this static test is the runnable proxy that catches the common regression: a new
 * tenant-scoped table that ships WITHOUT organization isolation in its RLS policy.
 *
 * It reads the actual schema + policy SQL and asserts every table carrying
 * organization_id is org-scoped (or user-scoped) in its policies, and that no such
 * table exposes a `select using (true)` cross-tenant leak.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const schema = readFileSync(resolve(root, "supabase/schema.sql"), "utf8");
const policies = readFileSync(resolve(root, "supabase/rls-policies.sql"), "utf8");

/** Tables declared with an organization_id column (tenant-scoped). */
function tenantScopedTables(sql: string): string[] {
  const tables: string[] = [];
  const re = /create table if not exists public\.(\w+)\s*\(([\s\S]*?)\n\);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    const [, name, body] = m;
    if (/\borganization_id\b/.test(body)) tables.push(name);
  }
  return tables;
}

/** Names excluded from the generic org-isolation loop (they get explicit policies). */
function genericLoopExclusions(sql: string): Set<string> {
  const m = sql.match(/c\.table_name not in \(([\s\S]*?)\)\s*\n\s*loop/);
  const names = m ? [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1]) : [];
  return new Set(names);
}

/** Tables named explicitly in a policy (`on public.x`) or in a dynamic `unnest(array[...])`. */
function explicitlyPolicied(sql: string): Set<string> {
  const named = [...sql.matchAll(/on public\.(\w+)/g)].map((x) => x[1]);
  const arrays = [...sql.matchAll(/unnest\(array\[([^\]]*)\]/g)].flatMap((x) =>
    [...x[1].matchAll(/'(\w+)'/g)].map((y) => y[1]),
  );
  return new Set([...named, ...arrays]);
}

describe("tenant data isolation (RLS)", () => {
  const tables = tenantScopedTables(schema);
  const excluded = genericLoopExclusions(policies);
  const explicit = explicitlyPolicied(policies);

  it("finds the tenant-scoped tables", () => {
    expect(tables.length).toBeGreaterThan(15);
    expect(tables).toContain("chemical_logs");
    expect(tables).toContain("shifts");
    expect(tables).toContain("messages");
  });

  it("defines the org-isolation helper and scopes by org/user", () => {
    expect(policies).toMatch(/function public\.current_org_id\(\)/);
    expect(policies).toContain("organization_id = public.current_org_id()");
  });

  it.each(tenantScopedTables(schema))("isolates %s by organization (generic loop or explicit)", (table) => {
    // Covered if it flows through the generic org-isolation loop, OR it's excluded
    // from that loop but gets an explicit / dynamically-created org-scoped policy.
    const inGenericLoop = !excluded.has(table);
    const hasExplicit = explicit.has(table);
    expect(inGenericLoop || hasExplicit, `${table} has no organization-scoped RLS policy`).toBe(true);
  });

  it("never exposes a tenant table with `select using (true)` (cross-tenant leak)", () => {
    // The only intentional public-insert table is quote_requests (no organization_id,
    // marketing form). Assert no org-scoped SELECT policy is wide open.
    const leak = /for select\s+using \(true\)/g;
    const matches = policies.match(leak) ?? [];
    // subscription_plans / setup_packages are reference tables (no org_id) — allowed.
    for (const line of policies.split("\n")) {
      if (/for select\s+using \(true\)/.test(line)) {
        expect(/plans|setup/.test(line.toLowerCase())).toBe(true);
      }
    }
    expect(matches.length).toBeLessThanOrEqual(2);
  });
});

describe("tenant config isolation (no cross-tenant bleed)", () => {
  it("resolves independent configs per tenant", () => {
    const villas = getTenantConfig("villas");
    const tidetown = getTenantConfig("tidetown");
    expect(villas.slug).not.toBe(tidetown.slug);
    // A module disabled for one tenant is unaffected in the other.
    expect(isModuleEnabled(villas, "lessons")).toBe(false);
    expect(isModuleEnabled(tidetown, "lessons")).toBe(true);
    // Role-label override on one does not appear on the other.
    expect(villas.roleLabels.org_admin).toBe("Admin / Pool Manager");
    expect(tidetown.roleLabels.org_admin).toBeUndefined();
  });
});
