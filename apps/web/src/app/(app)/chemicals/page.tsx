"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FlaskConical, AlertTriangle, CheckCircle2, Beaker } from "lucide-react";
import {
  getFacility, staffName, facilityName,
  CHEMICAL_FIELDS, type ChemicalLog,
} from "@poolops/shared";
import { useAccess, useMyStaffId } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { useTenantSeed } from "@/lib/tenant-data";
import { useTenantConfig } from "@/lib/tenant/provider";
import { useThemeColor } from "@/lib/tenant/use-theme-color";

/** The reading's taken-at time (falls back to the audit time for legacy rows). */
const takenOf = (c: { takenAt?: string; recordedAt: string }) => c.takenAt ?? c.recordedAt;

/** Value for a <input type="datetime-local"> representing `d` in local time. */
function toLocalInput(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

/** Format an ISO timestamp in the tenant's timezone (e.g. America/New_York). */
function fmtInTz(iso: string, tz: string, opts: Intl.DateTimeFormatOptions): string {
  try { return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: tz }).format(new Date(iso)); }
  catch { return new Date(iso).toLocaleString("en-US", opts); }
}
/** The calendar day (YYYY-MM-DD) an ISO timestamp falls on in the tenant timezone. */
function dayInTz(iso: string, tz: string): string {
  return fmtInTz(iso, tz, { year: "numeric", month: "2-digit", day: "2-digit" });
}
import { EmptyState } from "@/components/ui/empty-state";
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

/** Parameters whose out-of-range values are a swimmer-safety issue → recommend closure. */
const CRITICAL_KEYS = ["freeChlorine", "combinedChlorine", "ph"];

export default function ChemicalsPage() {
  const { can, staff: me, facilityId } = useAccess();
  const myStaffId = useMyStaffId();
  const { facilities, pools } = useTenantSeed();
  const config = useTenantConfig();
  const tz = config.timezone || "America/New_York";
  const expectedPerDay = config.operations.expectedReadingsPerDay; // per-tenant; Villas=3, others may be unset
  const chemicals = useDemo((s) => s.chemicals);
  const addLog = useDemo((s) => s.addChemicalLog);
  const brandLine = useThemeColor("--brand-600", "#0891B2");

  const [open, setOpen] = useState(false);
  const [chartFacility, setChartFacility] = useState(facilities[0]?.id ?? "");
  const [result, setResult] = useState<string[] | null>(null);
  const [form, setForm] = useState({
    facilityId: facilities[0]?.id ?? "", poolId: pools[0]?.id ?? "", takenAt: toLocalInput(new Date()),
    freeChlorine: "2.4", combinedChlorine: "0.2", ph: "7.5", alkalinity: "100",
    calciumHardness: "280", cyanuricAcid: "40", waterTemp: "82", notes: "", correctiveAction: "",
  });

  const facMatch = (fid: string) => facilityId === "all" || fid === facilityId;
  // Order by TAKEN-AT (so three readings in a day sort correctly), newest first.
  const visible = chemicals.filter((c) => facMatch(c.facilityId))
    .slice().sort((a, b) => new Date(takenOf(b)).getTime() - new Date(takenOf(a)).getTime());
  const todayKey = dayInTz(new Date().toISOString(), tz);
  const todayLogs = visible.filter((c) => dayInTz(takenOf(c), tz) === todayKey);
  const warnings = visible.filter((c) => c.outOfRange.length > 0);

  // Pool-closure status: for each facility, look at its most recent reading. If a
  // safety-critical parameter (chlorine / pH) is out of range, recommend closure.
  const poolStatus = facilities.filter((f) => facMatch(f.id)).map((f) => {
    const latest = visible.find((c) => c.facilityId === f.id); // newest first (store prepends)
    const critical = latest ? latest.outOfRange.filter((k) => CRITICAL_KEYS.includes(k)) : [];
    return { facility: f, latest, critical };
  });
  const closures = poolStatus.filter((p) => p.critical.length > 0);

  const chartData = useMemo(() => chemicals
    .filter((c) => c.facilityId === chartFacility)
    .slice().sort((a, b) => new Date(takenOf(a)).getTime() - new Date(takenOf(b)).getTime())
    .slice(-8)
    .map((c) => ({ t: fmtInTz(takenOf(c), tz, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), FC: c.freeChlorine, CC: c.combinedChlorine, pH: c.ph })),
    [chemicals, chartFacility, tz]);

  const facilityPools = pools.filter((p) => p.facilityId === form.facilityId);

  // Warn (don't block) on a suspiciously old backdate (> 14 days).
  const takenDate = form.takenAt ? new Date(form.takenAt) : new Date();
  const isFuture = takenDate.getTime() > Date.now() + 5 * 60_000; // 5-min tolerance
  const tooOld = takenDate.getTime() < Date.now() - 14 * 86_400_000;

  const submit = () => {
    if (isFuture) return; // block future timestamps
    const flags = addLog({
      facilityId: form.facilityId, poolId: form.poolId, recordedBy: myStaffId ?? me?.id ?? "unknown",
      takenAt: takenDate.toISOString(),
      freeChlorine: Number(form.freeChlorine), combinedChlorine: Number(form.combinedChlorine),
      ph: Number(form.ph), alkalinity: Number(form.alkalinity), calciumHardness: Number(form.calciumHardness),
      cyanuricAcid: Number(form.cyanuricAcid), waterTemp: Number(form.waterTemp),
      notes: form.notes || undefined, correctiveAction: form.correctiveAction || undefined,
    });
    setResult(flags);
  };

  const closeModal = () => { setOpen(false); setResult(null); setForm((f) => ({ ...f, takenAt: toLocalInput(new Date()) })); };

  return (
    <div className="space-y-6">
      <PageHeader title="Chemical Logs" subtitle="Record water chemistry and keep an audit-ready history."
        actions={can("chemicals.log") && facilities.length > 0 && <Button icon="FlaskConical" onClick={() => setOpen(true)}>Log reading</Button>} />

      {facilities.length === 0 && (
        <EmptyState icon="FlaskConical" title="No chemical readings logged yet"
          description="A reading is logged against a facility. Add your pool first, then record water chemistry to build an audit-ready history."
          action={can("facilities.manage") ? <Link href="/facilities" className="btn-primary">Add a facility</Link> : undefined} />
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={expectedPerDay ? `Readings today (of ${expectedPerDay})` : "Readings today"} value={todayLogs.length} icon="FlaskConical" intent={expectedPerDay && todayLogs.length < expectedPerDay ? "warning" : "brand"} />
        <StatCard label="Out of range" value={warnings.length} icon="AlertTriangle" intent={warnings.length ? "danger" : "success"} />
        <StatCard label="Facilities monitored" value={facilities.length} icon="Building2" intent="info" />
        <StatCard label="Total logs" value={visible.length} icon="ListChecks" intent="neutral" />
      </div>

      {closures.length > 0 && (
        <AlertCard intent="danger" title={`⚠ Close ${closures.length} pool${closures.length > 1 ? "s" : ""} now — unsafe water chemistry`}>
          {closures.map((c) => (
            <p key={c.facility.id} className="mt-0.5">
              <span className="font-semibold">{c.facility.name}</span> — {c.critical.map((k) => FIELD_LABEL[k] ?? k).join(", ")} out of safe range.
              Close the pool, correct chemistry, and re-test before reopening.
            </p>
          ))}
        </AlertCard>
      )}

      <SectionCard title="Pool safety status" subtitle="Based on each pool's most recent reading">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {poolStatus.map(({ facility, latest, critical }) => {
            const closed = critical.length > 0;
            const warn = !closed && (latest?.outOfRange.length ?? 0) > 0;
            return (
              <div key={facility.id} className={`rounded-xl border p-3 ${closed ? "border-rose-200 bg-rose-50" : warn ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{facility.name}</p>
                  <Badge intent={closed ? "danger" : warn ? "warning" : "success"}>
                    {closed ? "Close now" : warn ? "Monitor" : "Safe to open"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {latest ? `Last reading ${fmtInTz(takenOf(latest), tz, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "No readings yet"}
                  {closed && ` · ${critical.map((k) => FIELD_LABEL[k] ?? k).join(", ")}`}
                </p>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {warnings.length > 0 && (
        <AlertCard intent="danger" title={`${warnings.length} reading(s) out of range`}>
          Most recent: {facilityName(warnings[0].facilityId)} — {warnings[0].outOfRange.map((k) => FIELD_LABEL[k] ?? k).join(", ")}. {warnings[0].correctiveAction ?? "Corrective action recommended."}
        </AlertCard>
      )}

      <SectionCard title="Chlorine & pH trend" subtitle="Recent readings"
        actions={<Select value={chartFacility} onChange={(e) => setChartFacility(e.target.value)} className="w-auto">{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select>}>
        {chartData.length > 0 ? (
          <MultiLine data={chartData} xKey="t" lines={[
            // Free chlorine tracks the tenant brand; CC/pH are distinct series colors.
            { key: "FC", color: brandLine, name: "Free Cl" },
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
                  <td className="px-3 py-2.5"><p className="text-slate-600">{staffName(c.recordedBy)}</p><p className="text-xs text-slate-400">{fmtInTz(takenOf(c), tz, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <Modal open={open} onClose={closeModal} title="Log chemical reading" size="lg"
        footer={result === null
          ? <><Button variant="secondary" onClick={closeModal}>Cancel</Button><Button onClick={submit} icon="Beaker" disabled={isFuture}>Save reading</Button></>
          : <Button onClick={closeModal}>Done</Button>}>
        {result === null ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Facility"><Select value={form.facilityId} onChange={(e) => { const fid = e.target.value; setForm({ ...form, facilityId: fid, poolId: pools.find((p) => p.facilityId === fid)?.id ?? form.poolId }); }}>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
              <Field label="Pool / body"><Select value={form.poolId} onChange={(e) => setForm({ ...form, poolId: e.target.value })}>{facilityPools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            </div>
            <Field label="Date & time taken" hint={`Defaults to now (${tz}). Edit to log an earlier reading or catch up a missed entry.`}>
              <Input type="datetime-local" value={form.takenAt} onChange={(e) => setForm({ ...form, takenAt: e.target.value })} />
            </Field>
            {isFuture && <p className="flex items-center gap-1.5 text-xs text-rose-600"><AlertTriangle className="h-3.5 w-3.5" /> The taken-at time can't be in the future.</p>}
            {!isFuture && tooOld && <p className="flex items-center gap-1.5 text-xs text-amber-600"><AlertTriangle className="h-3.5 w-3.5" /> This reading is backdated more than two weeks — double-check the date.</p>}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CHEMICAL_FIELDS.map((f) => (
                <Field key={f.key} label={`${f.short} ${f.unit ? `(${f.unit})` : ""}`}>
                  {/* Decimal keypad + larger target: fast, low-typing entry on a phone. */}
                  <Input type="number" inputMode="decimal" step="0.1" value={(form as Record<string, string>)[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="py-2.5 text-base tabular-nums" />
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
