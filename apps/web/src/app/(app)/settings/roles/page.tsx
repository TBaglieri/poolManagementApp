"use client";

import Link from "next/link";
import { Monitor, Smartphone, KeyRound, Users } from "lucide-react";
import {
  ROLE_LIST, resolvePermissions, ALL_PERMISSION_KEYS, staff as seedStaff, type RoleSlug,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { RoleBadge } from "@/components/ui/badge";

function permCount(role: RoleSlug): number {
  if (role === "super_admin") return ALL_PERMISSION_KEYS.length + 4;
  if (role === "org_admin") return ALL_PERMISSION_KEYS.length - 1;
  return resolvePermissions(role).size;
}
function staffCount(role: RoleSlug): number {
  return seedStaff.filter((s) => s.primaryRole === role).length;
}

export default function RolesPage() {
  const { can } = useAccess();
  if (!can("settings.view")) return <AccessRestricted />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        subtitle="12 access levels from super admin to seasonal lifeguard. Authorization is enforced by the permission map (and RLS in Supabase mode)."
        actions={can("permissions.manage") ? <Link href="/settings/permissions" className="btn-primary"><KeyRound className="h-4 w-4" /> Permission matrix</Link> : undefined}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ROLE_LIST.map((r) => (
          <SectionCard key={r.slug}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <RoleBadge role={r.slug} />
                <h3 className="mt-2 font-semibold text-slate-900">{r.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{r.description}</p>
              </div>
              <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">L{r.level}</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><KeyRound className="h-3.5 w-3.5 text-brand-500" /> {permCount(r.slug)} permissions</span>
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-brand-500" /> {staffCount(r.slug)} staff</span>
              <span className="flex items-center gap-1">
                {r.surface === "mobile" ? <Smartphone className="h-3.5 w-3.5" /> : r.surface === "both" ? <><Monitor className="h-3.5 w-3.5" /><Smartphone className="h-3.5 w-3.5" /></> : <Monitor className="h-3.5 w-3.5" />}
                {r.surface === "both" ? "Web + mobile" : r.surface === "mobile" ? "Mobile" : "Web"}
              </span>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
