"use client";

import { useState } from "react";
import Link from "next/link";
import { FlaskConical, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { facilities, pools, enabledChemicalFields, type ID } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { useTenantConfig } from "@/lib/tenant/provider";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { cn } from "@/lib/cn";

const DEFAULTS: Record<string, number> = {
  freeChlorine: 2.0, combinedChlorine: 0.2, ph: 7.5, alkalinity: 100, calciumHardness: 280, cyanuricAcid: 40, waterTemp: 82,
};

export default function MobileChemicals() {
  const { can, staffId, facilityId, staff: me } = useAccess();
  const addLog = useDemo((s) => s.addChemicalLog);
  const config = useTenantConfig();
  // Only the chemical fields this tenant records (Villas → chlorine + pH).
  const fields = enabledChemicalFields(config);
  const fieldKeys = fields.map((f) => f.key) as string[];

  const [facility, setFacility] = useState<ID>(facilityId === "all" ? (me?.homeFacilityId ?? "fac_maplewood") : facilityId);
  const [values, setValues] = useState<Record<string, number>>(DEFAULTS);
  const [flags, setFlags] = useState<string[] | null>(null);

  if (!can("chemicals.log")) return <div className="p-4"><AccessRestricted message="Chemical logging requires an authorized role." /></div>;

  const facPools = pools.filter((p) => p.facilityId === facility);
  const set = (k: string, v: number) => setValues((s) => ({ ...s, [k]: v }));

  const submit = () => {
    if (!staffId) return;
    const result = addLog({
      facilityId: facility, poolId: facPools[0]?.id ?? "", recordedBy: staffId,
      freeChlorine: values.freeChlorine, combinedChlorine: values.combinedChlorine, ph: values.ph,
      alkalinity: values.alkalinity, calciumHardness: values.calciumHardness,
      cyanuricAcid: values.cyanuricAcid, waterTemp: values.waterTemp,
    }, fieldKeys); // only the tenant's enabled fields can be flagged
    setFlags(result);
  };

  return (
    <div className="pb-6">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/m/home" className="rounded-lg p-1 text-slate-400"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-base font-bold text-slate-900">Log chemicals</h1>
      </div>

      {flags && (
        <div className={cn("mx-4 mt-4 flex items-start gap-2 rounded-2xl border p-3 text-sm", flags.length ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
          {flags.length ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          {flags.length
            ? <span>Logged — <strong>{flags.length}</strong> reading(s) out of range. Take corrective action and re-test.</span>
            : <span>Logged — all readings in range. Nice work!</span>}
        </div>
      )}

      <div className="space-y-3 px-4 py-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Facility</label>
          <select value={facility} onChange={(e) => setFacility(e.target.value)} className="input">
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-medium text-slate-600">{f.short} {f.unit && <span className="text-slate-400">({f.unit})</span>}</label>
              <input type="number" step="0.1" value={values[f.key]} onChange={(e) => set(f.key, Number(e.target.value))} className="input" />
            </div>
          ))}
        </div>
        <button onClick={submit} className="btn-primary w-full justify-center py-3">
          <FlaskConical className="h-4 w-4" /> Save reading
        </button>
      </div>
    </div>
  );
}
