"use client";

import { useMemo, useState } from "react";
import { UsersRound, Plus, TrendingUp } from "lucide-react";
import { facilityName, format24h } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { useTenantSeed } from "@/lib/tenant-data";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { Field, Select, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SimpleBar } from "@/components/charts/charts-lazy";

export default function PatronCountsPage() {
  const { can, staffId, facilityId } = useAccess();
  const { facilities } = useTenantSeed();
  const stored = useDemo((s) => s.patron);
  const addPatron = useDemo((s) => s.addPatronCount);

  const [facility, setFacility] = useState<string>(facilityId === "all" ? (facilities[0]?.id ?? "") : facilityId);
  const [slot, setSlot] = useState("14:00");
  const [count, setCount] = useState(40);

  // No demo fallback — a real tenant with no counts shows empty charts.
  const all = stored;

  // Today's hourly counts for the selected facility.
  const todays = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return all
      .filter((p) => p.facilityId === facility && p.recordedAt.slice(0, 10) === today && p.timeSlot.includes(":"))
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [all, facility]);

  if (!can("patroncounts.view") && !can("patroncounts.log")) return <AccessRestricted />;

  const chartData = todays.map((p) => ({ time: format24h(p.timeSlot), count: p.count }));
  const peak = todays.reduce((m, p) => Math.max(m, p.count), 0);
  const latest = todays[todays.length - 1]?.count ?? 0;
  const avg = todays.length ? Math.round(todays.reduce((s, p) => s + p.count, 0) / todays.length) : 0;

  const submit = () => {
    if (!staffId) return;
    addPatron(facility, slot, count, staffId);
    setCount(40);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Patron Counts" subtitle="Hourly attendance for capacity planning and staffing decisions." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Current count" value={latest} icon="UsersRound" intent="brand" />
        <StatCard label="Today's peak" value={peak} icon="TrendingUp" intent="warning" />
        <StatCard label="Average" value={avg} icon="Activity" intent="info" />
        <StatCard label="Capacity" value={facilities.find((f) => f.id === facility)?.capacity ?? "—"} icon="Building2" intent="neutral" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <SectionCard
          title="Today's attendance"
          subtitle={facilityName(facility)}
          actions={
            <Select value={facility} onChange={(e) => setFacility(e.target.value)} className="w-48">
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          }
        >
          {chartData.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">No counts logged today. Record one below to start today&apos;s attendance trend.</p>
          ) : (
            <SimpleBar data={chartData} xKey="time" yKey="count" name="Patrons" height={260} />
          )}
        </SectionCard>

        {can("patroncounts.log") ? (
          <SectionCard title="Log a count" subtitle="Quick entry">
            <div className="space-y-3">
              <Field label="Facility">
                <Select value={facility} onChange={(e) => setFacility(e.target.value)}>
                  {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>
              </Field>
              <Field label="Time slot">
                <Input type="time" value={slot} onChange={(e) => setSlot(e.target.value)} />
              </Field>
              <Field label="Headcount">
                <Input type="number" min={0} value={count} onChange={(e) => setCount(Number(e.target.value))} />
              </Field>
              <Button className="w-full justify-center" onClick={submit} icon="Plus">Record count</Button>
              <p className="text-xs text-slate-400">Head lifeguards log counts hourly from the mobile app.</p>
            </div>
          </SectionCard>
        ) : (
          <SectionCard title="Read-only">
            <p className="py-6 text-center text-sm text-slate-400">Your role can view patron trends but not record counts.</p>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
