"use client";

import { useState } from "react";
import {
  MapPin, Phone, Clock, Users, Waves, Pencil, ChevronRight,
} from "lucide-react";
import {
  DEFAULT_CHEMICAL_RANGES, staffName, staffForFacility,
  POOL_TYPE_LABELS, type Facility,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useTenantSeed } from "@/lib/tenant-data";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { Drawer, Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { facilityStatusMeta } from "@/lib/status";
import { cn } from "@/lib/cn";

export default function FacilitiesPage() {
  const { can } = useAccess();
  const { facilities, pools } = useTenantSeed();
  const [list, setList] = useState<Facility[]>(facilities);
  const [selected, setSelected] = useState<Facility | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", capacity: "120", hours: "9:00 AM – 7:00 PM" });

  const openNow = list.filter((f) => f.status === "open").length;
  const maint = list.filter((f) => f.status === "maintenance").length;
  const capacity = list.reduce((s, f) => s + f.capacity, 0);

  const addFacility = () => {
    if (!form.name.trim()) return;
    setList((l) => [
      ...l,
      {
        id: `fac_${Date.now()}`, orgId: "", name: form.name, address: form.address || "—",
        poolType: "leisure", operatingHours: form.hours, capacity: Number(form.capacity) || 100,
        emergencyPhone: "(555) 911-0000", status: "open",
        chemicalRanges: DEFAULT_CHEMICAL_RANGES, inspectionRequired: true, imageHint: "from-cyan-500 to-blue-600",
      },
    ]);
    setAddOpen(false);
    setForm({ name: "", address: "", capacity: "120", hours: "9:00 AM – 7:00 PM" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facilities"
        subtitle="Manage your community pools and aquatic centers."
        actions={can("facilities.manage") && <Button icon="Plus" onClick={() => setAddOpen(true)}>Add facility</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Facilities" value={list.length} icon="Building2" intent="brand" />
        <StatCard label="Open now" value={openNow} icon="DoorOpen" intent="success" />
        <StatCard label="In maintenance" value={maint} icon="Wrench" intent="warning" />
        <StatCard label="Total capacity" value={capacity.toLocaleString()} icon="Users" intent="info" />
      </div>

      {list.length === 0 && (
        <EmptyState icon="Building2" title="No facilities added yet"
          description="Add your pool to start tracking chemistry, schedules, and staffing."
          action={can("facilities.manage") ? <Button icon="Plus" onClick={() => setAddOpen(true)}>Add facility</Button> : undefined} />
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {list.map((f) => {
          const meta = facilityStatusMeta(f.status);
          const team = staffForFacility(f.id).length;
          const facilityPools = pools.filter((p) => p.facilityId === f.id);
          return (
            <div key={f.id} className="card card-hover overflow-hidden">
              <div className={cn("relative h-24 bg-gradient-to-br", f.imageHint)}>
                <div className="absolute inset-0 flex items-center justify-center opacity-30"><Waves className="h-16 w-16 text-white" /></div>
                <div className="absolute right-3 top-3"><StatusBadge {...meta} /></div>
              </div>
              <div className="p-5">
                <h3 className="text-base font-semibold text-slate-900">{f.name}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" /> {f.address}</p>
                <div className="mt-4 grid grid-cols-2 gap-y-2.5 text-sm">
                  <Info icon={Waves} label={POOL_TYPE_LABELS[f.poolType]} />
                  <Info icon={Users} label={`Cap. ${f.capacity}`} />
                  <Info icon={Clock} label={f.operatingHours} />
                  <Info icon={Phone} label={f.emergencyPhone} />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-400">{team} staff · {facilityPools.length} pools · Mgr {staffName(f.managerId)}</span>
                  <button onClick={() => setSelected(f)} className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
                    Details <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail drawer */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name} width="max-w-lg">
        {selected && (
          <div className="space-y-5">
            <div className={cn("flex h-28 items-center justify-center rounded-xl bg-gradient-to-br", selected.imageHint)}>
              <Waves className="h-12 w-12 text-white/50" />
            </div>
            <div className="flex items-center justify-between">
              <StatusBadge {...facilityStatusMeta(selected.status)} />
              {can("facilities.manage") && <Button variant="secondary" size="sm" icon="Pencil">Edit</Button>}
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Detail label="Address" value={selected.address} />
              <Detail label="Pool type" value={POOL_TYPE_LABELS[selected.poolType]} />
              <Detail label="Operating hours" value={selected.operatingHours} />
              <Detail label="Capacity" value={String(selected.capacity)} />
              <Detail label="Emergency phone" value={selected.emergencyPhone} />
              <Detail label="Manager" value={staffName(selected.managerId)} />
            </dl>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Pools / bodies of water</p>
              <ul className="space-y-2">
                {pools.filter((p) => p.facilityId === selected.id).map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-700">{p.name}</span>
                    <span className="text-xs text-slate-400">{p.volumeGallons.toLocaleString()} gal · {p.maxDepthFt} ft</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Chemical ranges</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <RangeRow label="Free chlorine" range={selected.chemicalRanges.freeChlorine} unit="ppm" />
                <RangeRow label="pH" range={selected.chemicalRanges.ph} unit="" />
                <RangeRow label="Alkalinity" range={selected.chemicalRanges.alkalinity} unit="ppm" />
                <RangeRow label="Water temp" range={selected.chemicalRanges.waterTemp} unit="°F" />
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add facility"
        footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={addFacility}>Add facility</Button></>}>
        <div className="space-y-4">
          <Field label="Facility name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Westgate Splash Park" /></Field>
          <Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, City" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Capacity"><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></Field>
            <Field label="Operating hours"><Input value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Info({ icon: Icon, label }: { icon: typeof Clock; label: string }) {
  return <span className="flex items-center gap-1.5 text-slate-600"><Icon className="h-3.5 w-3.5 text-slate-400" /> <span className="truncate">{label}</span></span>;
}
function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-0.5 font-medium text-slate-700">{value}</dd></div>;
}
function RangeRow({ label, range, unit }: { label: string; range: [number, number]; unit: string }) {
  return <div className="rounded-lg bg-slate-50 px-2.5 py-1.5"><p className="text-slate-400">{label}</p><p className="font-semibold text-slate-700">{range[0]}–{range[1]} {unit}</p></div>;
}
