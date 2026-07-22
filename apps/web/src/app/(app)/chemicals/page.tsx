"use client";

import { useMemo, useState } from "react";
import { FlaskConical, AlertTriangle, CheckCircle2, Beaker } from "lucide-react";
import {
  facilities, pools, getFacility, staffName, facilityName, formatDateTime, formatTime,
  CHEMICAL_FIELDS, type ChemicalLog,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { AlertCard } from "@/components/ui/alert-card";
import { MultiLine } from "@/components/charts/charts-lazy";

const FIELD_LABEL: Record<string, string> = Object.fromEntries(CHEMICAL_FIELDS.map((f) => [f.key, f.short]));

export default function ChemicalsPage() {
  const { can, staff: me, facilityId } = useAccess();
  const chemicals = useDemo((s) => s.chemicals);
  const addLog = useDemo((s) => s.addChemicalLog);

  const [open, setOpen] = useState(false);
  const [chartFacility, setChartFacility] = useState(facilities[0].id);
  const [result, setResult] = useState<string[] | null>(null);
  const [form, setForm] = useState({
    facilityId: facilities[0].id, poolId: pools[0].id,
    freeChlorine: "2.4", combinedChlorine: "0.2", ph: "7.5", alkalinity: "100",
    calciumHardness: "280", cyanuricAcid: "40", waterTemp: "82", notes: "", correctiveAction: "",
  });

  const facMatch = (fid: string) => facilityId === "all" || fid === facilityId;
  const visible = chemicals.filter((c) => facMatch(c.facilityId));
  const todayLogs = visible.filter((c) => new Date(c.recordedAt).toDateString() === new Date().toDateString());
  const warnings = visible.filter((c) => c.outOfRange.length > 0);

  const chartData = useMemo(() => chemicals
    .filter((c) => c.facilityId === chartFacility)
    .slice(0, 8).reverse()
    .map((c) => ({ t: formatTime(c.recordedAt), FC: c.freeChlorine, CC: c.combinedChlorine, pH: c.ph })),
    [chemicals, chartFacility]);

  const facilityPools = pools.filter((p) => p.facilityId === form.facilityId);

  const submit = () => {
    const flags = addLog({
      facilityId: form.facilityId, poolId: form.poolId, recordedBy: me?.id ?? "staff_head1",
      freeChlorine: Number(form.freeChlorine), combinedChlorine: Number(form.combinedChlorine),
      ph: Number(form.ph), alkalinity: Number(form.alkalinity), calciumHardness: Number(form.calciumHardness),
      cyanuricAcid: Number(form.cyanuricAcid), waterTemp: Number(form.waterTemp),
      notes: form.notes || undefined, correctiveAction: form.correctiveAction || undefined,
    });
    setResult(flags);
  };

  const closeModal = () => { setOpen(false); setResult(null); };

  return (
    <div className="space-y-6">
      <PageHeader title="Chemical Logs" subtitle="Record water chemistry and keep an audit-ready history."
        actions={can("chemicals.log") && <Button icon="FlaskConical" onClick={() => setOpen(true)}>Log reading</Button>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Readings today" value={todayLogs.length} icon="FlaskConical" intent="brand" />
        <StatCard label="Out of range" value={warnings.length} icon="AlertTriangle" intent={warnings.length ? "danger" : "success"} />
        <StatCard label="Facilities monitored" value={facilities.length} icon="Building2" intent="info" />
        <StatCard label="Total logs" value={visible.length} icon="ListChecks" intent="neutral" />
      </div>

      {warnings.length > 0 && (
        <AlertCard intent="danger" title={`${warnings.length} reading(s) out of range`}>
          Most recent: {facilityName(warnings[0].facilityId)} — {warnings[0].outOfRange.map((k) => FIELD_LABEL[k] ?? k).join(", ")}. {warnings[0].correctiveAction ?? "Corrective action recommended."}
        </AlertCard>
      )}

      <SectionCard title="Chlorine & pH trend" subtitle="Recent readings"
        actions={<Select value={chartFacility} onChange={(e) => setChartFacility(e.target.value)} className="w-auto">{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select>}>
        {chartData.length > 0 ? (
          <MultiLine data={chartData} xKey="t" lines={[
            { key: "FC", color: "#0891B2", name: "Free Cl" },
            { key: "CC", color: "#f59e0b", name: "Comb. Cl" },
            { key: "pH", color: "#6366f1", name: "pH" },
          ]} />
        ) : <p className="py-10 text-center text-sm text-slate-400">No readings for this facility.</p>}
      </SectionCard>

      <SectionCard title="Reading history" subtitle="Audit trail with entered-by & timestamp">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2.5 text-left">Facility / Pool</th>
                {CHEMICAL_FIELDS.map((f) => <th key={f.key} className="px-2 py-2.5 text-right">{f.short}</th>)}
                <th className="px-3 py-2.5 text-left">By / When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.slice(0, 12).map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-slate-700">{facilityName(c.facilityId)}</p>
                    {c.outOfRange.length > 0 && <Badge intent="danger" className="mt-0.5"><AlertTriangle className="h-3 w-3" /> {c.outOfRange.length} flagged</Badge>}
                  </td>
                  {CHEMICAL_FIELDS.map((f) => {
                    const flagged = c.outOfRange.includes(f.key);
                    return <td key={f.key} className={`px-2 py-2.5 text-right ${flagged ? "font-bold text-rose-600" : "text-slate-600"}`}>{(c as unknown as Record<string, number>)[f.key]}</td>;
                  })}
                  <td className="px-3 py-2.5"><p className="text-slate-600">{staffName(c.recordedBy)}</p><p className="text-xs text-slate-400">{formatDateTime(c.recordedAt)}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <Modal open={open} onClose={closeModal} title="Log chemical reading" size="lg"
        footer={result === null
          ? <><Button variant="secondary" onClick={closeModal}>Cancel</Button><Button onClick={submit} icon="Beaker">Save reading</Button></>
          : <Button onClick={closeModal}>Done</Button>}>
        {result === null ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Facility"><Select value={form.facilityId} onChange={(e) => { const fid = e.target.value; setForm({ ...form, facilityId: fid, poolId: pools.find((p) => p.facilityId === fid)?.id ?? form.poolId }); }}>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
              <Field label="Pool / body"><Select value={form.poolId} onChange={(e) => setForm({ ...form, poolId: e.target.value })}>{facilityPools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CHEMICAL_FIELDS.map((f) => (
                <Field key={f.key} label={`${f.short} ${f.unit ? `(${f.unit})` : ""}`}>
                  <Input type="number" step="0.1" value={(form as Record<string, string>)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                </Field>
              ))}
            </div>
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observations…" /></Field>
            <Field label="Corrective action (if needed)"><Input value={form.correctiveAction} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} placeholder="e.g. Added chlorine, retest in 2h" /></Field>
            <p className="text-xs text-slate-400">Values outside this facility's configured ranges are flagged automatically.</p>
          </div>
        ) : result.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="mt-3 font-semibold text-slate-800">All readings in range ✓</p>
            <p className="text-sm text-slate-500">Logged to the audit trail.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4 text-center">
            <AlertTriangle className="h-12 w-12 text-rose-500" />
            <p className="mt-3 font-semibold text-slate-800">{result.length} value(s) out of range</p>
            <p className="text-sm text-slate-500">{result.map((k) => FIELD_LABEL[k] ?? k).join(", ")} flagged. Take corrective action and re-test.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
