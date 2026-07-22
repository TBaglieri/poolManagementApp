"use client";

import { useState } from "react";
import { HousePlus, Users, Mail, Phone, MapPin, ShieldCheck, ShieldAlert } from "lucide-react";
import { households, members, type Household } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/cn";

const STATUS_INTENT = { active: "success", expired: "danger", pending: "warning", frozen: "neutral" } as const;

export default function MembersPage() {
  const { can } = useAccess();
  const [filter, setFilter] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  if (!can("members.view")) return <AccessRestricted />;

  const filtered = households.filter((h) => filter === "all" || h.membershipStatus === filter);
  const selected = households.find((h) => h.id === activeId) ?? filtered[0];
  const selectedMembers = members.filter((m) => m.householdId === selected?.id);

  const tabs = [
    { key: "all", label: "All", count: households.length },
    { key: "active", label: "Active", count: households.filter((h) => h.membershipStatus === "active").length },
    { key: "pending", label: "Pending", count: households.filter((h) => h.membershipStatus === "pending").length },
    { key: "expired", label: "Expired", count: households.filter((h) => h.membershipStatus === "expired").length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Members & Households" subtitle="Household memberships, contacts, and waiver status." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Households" value={households.length} icon="HousePlus" intent="brand" />
        <StatCard label="Members" value={members.length} icon="Users" intent="info" />
        <StatCard label="Active" value={households.filter((h) => h.membershipStatus === "active").length} icon="BadgeCheck" intent="success" />
        <StatCard label="Waivers pending" value={households.filter((h) => !h.waiverSigned).length} icon="ShieldAlert" intent="warning" />
      </div>

      <Tabs tabs={tabs} active={filter} onChange={(k) => { setFilter(k); setActiveId(null); }} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <SectionCard title="Households" subtitle={`${filtered.length} shown`}>
          <div className="space-y-2.5">
            {filtered.map((h) => (
              <button key={h.id} onClick={() => setActiveId(h.id)}
                className={cn("flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left transition-colors", selected?.id === h.id ? "border-brand-400 bg-brand-50/40" : "border-slate-200 hover:bg-slate-50")}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><HousePlus className="h-4 w-4" /></span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{h.name}</p>
                    <p className="text-xs text-slate-400">{h.primaryContact} · {h.memberIds.length} members</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {h.waiverSigned ? <ShieldCheck className="h-4 w-4 text-emerald-500" /> : <ShieldAlert className="h-4 w-4 text-amber-500" />}
                  <Badge intent={STATUS_INTENT[h.membershipStatus]}>{h.membershipStatus}</Badge>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Household details" subtitle={selected?.name}>
          {!selected ? <p className="py-6 text-center text-sm text-slate-400">Select a household.</p> : (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <Detail icon={Mail} value={selected.email} />
                <Detail icon={Phone} value={selected.phone} />
                <Detail icon={MapPin} value={selected.address} />
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                {selected.waiverSigned ? <><ShieldCheck className="h-4 w-4 text-emerald-500" /> Waiver on file</> : <><ShieldAlert className="h-4 w-4 text-amber-500" /> Waiver pending signature</>}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Members</p>
                <ul className="space-y-1.5">
                  {selectedMembers.map((m) => (
                    <li key={m.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-700">{m.firstName} {m.lastName}</span>
                      <span className="text-xs text-slate-400">age {m.age}{m.isPrimary ? " · primary" : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {selected.notes && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{selected.notes}</p>}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, value }: { icon: typeof Mail; value: string }) {
  return <p className="flex items-center gap-2 text-slate-600"><Icon className="h-4 w-4 shrink-0 text-slate-400" /> {value}</p>;
}
