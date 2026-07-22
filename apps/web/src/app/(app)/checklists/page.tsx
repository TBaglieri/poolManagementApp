"use client";

import { useState } from "react";
import { ListChecks, Check, Clock, CheckCircle2 } from "lucide-react";
import {
  checklistTemplates, facilities, getFacility, staffName, facilityName, formatTime,
  type ChecklistTemplate,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export default function ChecklistsPage() {
  const { can, staff: me, facilityId } = useAccess();
  const completions = useDemo((s) => s.checklists);
  const complete = useDemo((s) => s.completeChecklist);
  const [runner, setRunner] = useState<ChecklistTemplate | null>(null);

  const today = completions.filter((c) => new Date(c.completedAt).toDateString() === new Date().toDateString());
  const doneToday = today.filter((c) => c.status === "complete").length;
  const incomplete = today.filter((c) => c.status !== "complete").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Checklists" subtitle="Daily opening, closing, and safety checklists." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Templates" value={checklistTemplates.length} icon="ListChecks" intent="brand" />
        <StatCard label="Completed today" value={doneToday} icon="CheckCircle2" intent="success" />
        <StatCard label="Incomplete" value={incomplete} icon="Clock" intent="warning" />
        <StatCard label="Facilities" value={facilities.length} icon="Building2" intent="info" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {checklistTemplates.map((t) => {
          const todays = today.filter((c) => c.templateId === t.id);
          const done = todays.some((c) => c.status === "complete");
          return (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><ListChecks className="h-5 w-5" /></span>
                <Badge intent={done ? "success" : "neutral"}>{done ? "Done today" : t.cadence}</Badge>
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">{t.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{t.items.length} items · {t.facilityIds.length} facilities</p>
              <div className="mt-3 space-y-1">
                {t.items.slice(0, 3).map((i) => <p key={i.id} className="flex items-center gap-1.5 text-xs text-slate-500"><Check className="h-3 w-3 text-slate-300" /> {i.label}</p>)}
                {t.items.length > 3 && <p className="text-xs text-slate-400">+{t.items.length - 3} more</p>}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-400">{todays.length} completions today</span>
                {can("checklists.complete") && <Button size="sm" onClick={() => setRunner(t)}>Run checklist</Button>}
              </div>
            </div>
          );
        })}
      </div>

      <SectionCard title="Completion log" subtitle="Today's submissions">
        {today.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No checklists completed yet today.</p> : (
          <ul className="divide-y divide-slate-100">
            {today.map((c) => {
              const t = checklistTemplates.find((x) => x.id === c.templateId);
              return (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", c.status === "complete" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                      {c.status === "complete" ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{t?.name}</p>
                      <p className="text-xs text-slate-400">{facilityName(c.facilityId)} · {staffName(c.completedBy)} · {formatTime(c.completedAt)}</p>
                    </div>
                  </div>
                  <Badge intent={c.status === "complete" ? "success" : "warning"}>{c.checkedItemIds.length}/{t?.items.length} items</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {runner && <ChecklistRunnerModal template={runner} onClose={() => setRunner(null)}
        onSubmit={(checked, note, fac) => { complete({ templateId: runner.id, facilityId: fac, completedBy: me?.id ?? "staff_head1", status: checked.length === runner.items.length ? "complete" : "incomplete", checkedItemIds: checked, note }); setRunner(null); }} />}
    </div>
  );
}

function ChecklistRunnerModal({ template, onClose, onSubmit }: {
  template: ChecklistTemplate;
  onClose: () => void;
  onSubmit: (checked: string[], note: string, facilityId: string) => void;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [fac, setFac] = useState(template.facilityIds[0]);
  const toggle = (id: string) => setChecked((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);

  return (
    <Modal open onClose={onClose} title={template.name} description={`${checked.length}/${template.items.length} complete`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSubmit(checked, note, fac)} icon="Check">Submit checklist</Button></>}>
      <div className="space-y-3">
        <Field label="Facility"><Select value={fac} onChange={(e) => setFac(e.target.value)}>{template.facilityIds.map((id) => <option key={id} value={id}>{facilityName(id)}</option>)}</Select></Field>
        <ul className="space-y-2">
          {template.items.map((item) => {
            const on = checked.includes(item.id);
            return (
              <li key={item.id}>
                <button onClick={() => toggle(item.id)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors", on ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 hover:bg-slate-50")}>
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-md border-2", on ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300")}>{on && <Check className="h-4 w-4" />}</span>
                  <span className={cn("text-sm", on ? "font-medium text-slate-800" : "text-slate-600")}>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <Field label="Notes"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything to flag?" /></Field>
        <div className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">Photo attachment placeholder</div>
      </div>
    </Modal>
  );
}
