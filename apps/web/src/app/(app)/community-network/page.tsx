"use client";

import { Network, MapPin, Users, Waves, Handshake, ArrowUpRight } from "lucide-react";
import { facilities } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { facilityStatusMeta } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { StatusBadge } from "@/components/ui/badge";

// Partner organizations in the regional aquatics network (demo).
const PARTNERS = [
  { name: "Cedar Falls Parks & Rec", type: "Municipality", facilities: 5, staff: 120, sharing: "Shared lifeguard pool & mutual-aid coverage" },
  { name: "Riverside Swim League", type: "Swim Club", facilities: 2, staff: 38, sharing: "Cross-certified instructors" },
  { name: "Summit Day Camps", type: "Summer Camp", facilities: 3, staff: 64, sharing: "Seasonal staff exchange" },
  { name: "Lakeside School District", type: "School District", facilities: 4, staff: 90, sharing: "Off-season facility sharing" },
];

export default function CommunityNetworkPage() {
  const { can } = useAccess();
  if (!can("community.view")) return <AccessRestricted message="The community network is available to operations managers and admins." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Community Network" subtitle="Partner pools and organizations for mutual-aid coverage, shared staff, and resource sharing." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Your facilities" value={facilities.length} icon="Building2" intent="brand" />
        <StatCard label="Partner orgs" value={PARTNERS.length} icon="Handshake" intent="info" />
        <StatCard label="Network facilities" value={PARTNERS.reduce((s, p) => s + p.facilities, facilities.length)} icon="Network" intent="success" />
        <StatCard label="Shared staff pool" value={PARTNERS.reduce((s, p) => s + p.staff, 0)} icon="Users" intent="warning" />
      </div>

      <SectionCard title="Your facilities" subtitle="On the PoolOps network">
        <div className="grid gap-4 sm:grid-cols-2">
          {facilities.map((f) => (
            <div key={f.id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Waves className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">{f.name}</p>
                  <StatusBadge {...facilityStatusMeta(f.status)} />
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400"><MapPin className="h-3.5 w-3.5" /> {f.address}</p>
                <p className="mt-0.5 text-xs text-slate-400">{f.operatingHours} · cap {f.capacity}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Partner organizations" subtitle="Mutual-aid & resource sharing">
        <div className="grid gap-4 md:grid-cols-2">
          {PARTNERS.map((p) => (
            <div key={p.name} className="card card-hover p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Handshake className="h-4 w-4" /></span>
                  <div>
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.type}</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300" />
              </div>
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Network className="h-3.5 w-3.5" /> {p.facilities} facilities</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {p.staff} staff</span>
              </div>
              <p className="mt-3 rounded-lg bg-brand-50/60 px-3 py-2 text-xs text-brand-800">{p.sharing}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <p className="text-xs text-slate-400">The community network enables mutual-aid coverage requests, shared certifications, and seasonal staff exchange across partner organizations.</p>
    </div>
  );
}
