"use client";

import { useState } from "react";
import Link from "next/link";
import { Wrench, Camera, CheckCircle2, ArrowLeft } from "lucide-react";
import { facilities, type IssuePriority } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { cn } from "@/lib/cn";

const PRIORITIES: { key: IssuePriority; label: string; cls: string }[] = [
  { key: "low", label: "Low", cls: "border-slate-300 text-slate-600" },
  { key: "medium", label: "Medium", cls: "border-sky-300 text-sky-700" },
  { key: "high", label: "High", cls: "border-amber-300 text-amber-700" },
  { key: "urgent", label: "Urgent", cls: "border-rose-300 text-rose-700" },
];

export default function MobileReport() {
  const { staffId, facilityId, staff: me } = useAccess();
  const addIssue = useDemo((s) => s.addIssue);

  const [facility, setFacility] = useState(facilityId === "all" ? (me?.homeFacilityId ?? "fac_maplewood") : facilityId);
  const [area, setArea] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [done, setDone] = useState(false);

  const submit = () => {
    if (!title.trim() || !staffId) return;
    addIssue({
      facilityId: facility, area: area || "General", title: title.trim(), description,
      priority, status: "new", reportedBy: staffId, assignedTo: null, hasPhoto: false,
    });
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></span>
        <h1 className="mt-4 text-lg font-bold text-slate-900">Issue reported</h1>
        <p className="mt-1 text-sm text-slate-500">Your maintenance team has been notified. Thanks for keeping the pool safe!</p>
        <div className="mt-6 flex w-full flex-col gap-2">
          <button onClick={() => { setDone(false); setTitle(""); setDescription(""); setArea(""); }} className="btn-primary justify-center">Report another</button>
          <Link href="/m/home" className="btn-secondary justify-center">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/m/home" className="rounded-lg p-1 text-slate-400"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-base font-bold text-slate-900">Report an issue</h1>
      </div>

      <div className="space-y-4 px-4 py-4">
        <Field label="Facility">
          <select value={facility} onChange={(e) => setFacility(e.target.value)} className="input">
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
        <Field label="Area">
          <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Pump room, Deck, Restroom" className="input" />
        </Field>
        <Field label="What's wrong?">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" className="input" />
        </Field>
        <Field label="Details">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe the issue…" className="input resize-y" />
        </Field>
        <Field label="Priority">
          <div className="grid grid-cols-4 gap-2">
            {PRIORITIES.map((p) => (
              <button key={p.key} onClick={() => setPriority(p.key)}
                className={cn("rounded-xl border-2 py-2 text-xs font-semibold", priority === p.key ? p.cls + " bg-slate-50" : "border-slate-200 text-slate-400")}>
                {p.label}
              </button>
            ))}
          </div>
        </Field>
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-3 text-sm text-slate-500">
          <Camera className="h-4 w-4" /> Add photo (placeholder)
        </button>
        <button onClick={submit} disabled={!title.trim()} className="btn-primary w-full justify-center py-3 disabled:opacity-50">
          <Wrench className="h-4 w-4" /> Submit report
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
