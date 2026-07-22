"use client";

import { Fragment, useMemo, useState } from "react";
import { Check, KeyRound } from "lucide-react";
import {
  PERMISSIONS, ROLE_LIST, resolvePermissions, getRole, type PermissionDef, type RoleSlug,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { cn } from "@/lib/cn";

// Show the operational roles as columns (super_admin/org_admin are full-access).
const COLUMN_ROLES: RoleSlug[] = [
  "ops_manager", "lifeguard_manager", "scheduling_manager", "payroll_team",
  "hr_coordinator", "head_lifeguard", "lifeguard", "swim_instructor", "maintenance", "auditor",
];

export default function PermissionsPage() {
  const { can } = useAccess();
  const [query, setQuery] = useState("");

  const sets = useMemo(
    () => Object.fromEntries(COLUMN_ROLES.map((r) => [r, resolvePermissions(r)])) as Record<RoleSlug, Set<string>>,
    [],
  );

  if (!can("permissions.manage") && !can("roles.manage")) {
    return <AccessRestricted message="The permission matrix is limited to organization admins." />;
  }

  const groups = useMemo(() => {
    const filtered = PERMISSIONS.filter((p) => !query || p.label.toLowerCase().includes(query.toLowerCase()) || p.key.includes(query.toLowerCase()));
    return filtered.reduce<Record<string, PermissionDef[]>>((acc, p) => {
      (acc[p.group] ||= []).push(p);
      return acc;
    }, {});
  }, [query]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permission matrix"
        subtitle="Effective permissions per role. Super Admin and Org Admin have full access and are omitted as columns."
        actions={
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter permissions…" className="input w-56 pl-8" />
          </div>
        }
      />

      <SectionCard bodyClassName="p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Permission</th>
                {COLUMN_ROLES.map((r) => (
                  <th key={r} className="px-2 py-3 text-center">
                    <span className="block text-[11px] font-semibold text-slate-600">{getRole(r).shortName}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(groups).map(([group, perms]) => (
                <Fragment key={group}>
                  <tr className="bg-slate-50">
                    <td colSpan={COLUMN_ROLES.length + 1} className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">{group}</td>
                  </tr>
                  {perms.map((p) => (
                    <tr key={p.key} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-2 text-slate-700">{p.label} <span className="ml-1 text-[10px] text-slate-300">{p.key}</span></td>
                      {COLUMN_ROLES.map((r) => (
                        <td key={r} className="px-2 py-2 text-center">
                          {sets[r].has(p.key)
                            ? <Check className={cn("mx-auto h-4 w-4", "text-emerald-500")} />
                            : <span className="text-slate-200">·</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <p className="text-xs text-slate-400">
        This UI-level matrix mirrors <code>packages/shared/src/rbac/permissions.ts</code>. In Supabase mode the same rules are enforced server-side by RLS policies — never trust the client for authorization.
      </p>
    </div>
  );
}
