"use client";

import { useMemo, useState } from "react";
import { ListChecks, Check, Clock, CheckCircle2, Plus, Pencil, Trash2, Sparkles, GripVertical } from "lucide-react";
import { staffName, uid, type ChecklistTemplate, type ChecklistItem, type ChecklistCadence } from "@poolops/shared";
import { useAccess, useMyStaffId } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { useTenantSeed } from "@/lib/tenant-data";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";

const CADENCES: ChecklistCadence[] = ["daily", "per_shift", "weekly", "custom"];
const CADENCE_LABEL: Record<ChecklistCadence, string> = { daily: "Daily", per_shift: "Per shift", weekly: "Weekly", custom: "Custom" };

export default function ChecklistsPage() {
  const { can, staff: me } = useAccess();
  const myStaffId = useMyStaffId();
  const { facilities } = useTenantSeed();
  const templates = useDemo((s) => s.checklistTemplates);
  const completions = useDemo((s) => s.checklists);
  const complete = useDemo((s) => s.completeChecklist);
  const removeTemplate = useDemo((s) => s.removeChecklistTemplate);
  const importExamples = useDemo((s) => s.importExampleChecklists);

  const [runner, setRunner] = useState<ChecklistTemplate | null>(null);
  const [editor, setEditor] = useState<ChecklistTemplate | "new" | null>(null);

  const canManage = can("checklists.manage");
  const facilityName = (id: string) => facilities.find((f) => f.id === id)?.name ?? "—";
  const active = templates.filter((t) => !t.archived);

  const today = completions.filter((c) => new Date(c.completedAt).toDateString() === new Date().toDateString());
  const doneToday = today.filter((c) => c.status === "complete").length;
  const incomplete = today.filter((c) => c.status !== "complete").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklists"
        subtitle="Opening, closing, and safety checklists your team runs each shift."
        actions={canManage ? <Button icon="Plus" onClick={() => setEditor("new")}>New checklist</Button> : undefined}
      />

      {active.length === 0 ? (
        <EmptyState
          icon="ListChecks"
          title="No checklists yet"
          description={canManage
            ? "Create a checklist your team runs each shift — or start from a set of common examples you can then edit."
            : "Your admin hasn't set up any checklists yet. Check back soon."}
          action={canManage ? (
            <div className="flex flex-wrap justify-center gap-2">
              <Button icon="Plus" onClick={() => setEditor("new")}>Create checklist</Button>
              <Button variant="secondary" onClick={importExamples}><Sparkles className="h-4 w-4" /> Start from examples</Button>
            </div>
          ) : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Checklists" value={active.length} icon="ListChecks" intent="brand" />
            <StatCard label="Completed today" value={doneToday} icon="CheckCircle2" intent="success" />
            <StatCard label="Incomplete" value={incomplete} icon="Clock" intent="warning" />
            <StatCard label="Facilities" value={facilities.length} icon="Building2" intent="info" />
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {active.map((t) => {
              const todays = today.filter((c) => c.templateId === t.id);
              const done = todays.some((c) => c.status === "complete");
              return (
                <div key={t.id} className="card p-5">
                  <div className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><ListChecks className="h-5 w-5" /></span>
                    <Badge intent={done ? "success" : "neutral"}>{done ? "Done today" : CADENCE_LABEL[t.cadence]}</Badge>
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">{t.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{t.items.length} items · {t.facilityIds.length || facilities.length} facilit{(t.facilityIds.length || facilities.length) === 1 ? "y" : "ies"}</p>
                  <div className="mt-3 space-y-1">
                    {t.items.slice(0, 3).map((i) => <p key={i.id} className="flex items-center gap-1.5 text-xs text-slate-500"><Check className="h-3 w-3 text-slate-300" /> {i.label}</p>)}
                    {t.items.length > 3 && <p className="text-xs text-slate-400">+{t.items.length - 3} more</p>}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                    <span className="text-xs text-slate-400">{todays.length} today</span>
                    <div className="flex items-center gap-1">
                      {canManage && (
                        <>
                          <button onClick={() => setEditor(t)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Edit"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => { if (confirm(`Delete "${t.name}"? Its completion history is kept.`)) removeTemplate(t.id); }} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                      {can("checklists.complete") && <Button size="sm" onClick={() => setRunner(t)}>Run</Button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <SectionCard title="Completion log" subtitle="Today's submissions">
            {today.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No checklists completed yet today.</p> : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {today.map((c) => {
                  const t = templates.find((x) => x.id === c.templateId);
                  return (
                    <li key={c.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", c.status === "complete" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                          {c.status === "complete" ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t?.name ?? "Checklist"}</p>
                          <p className="text-xs text-slate-400">{facilityName(c.facilityId)} · {staffName(c.completedBy)}</p>
                        </div>
                      </div>
                      <Badge intent={c.status === "complete" ? "success" : "warning"}>{c.checkedItemIds.length}/{t?.items.length ?? 0} items</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </>
      )}

      {runner && (
        <ChecklistRunnerModal
          template={runner}
          facilities={facilities.filter((f) => runner.facilityIds.length === 0 || runner.facilityIds.includes(f.id))}
          onClose={() => setRunner(null)}
          onSubmit={(checked, note, fac) => {
            complete({ templateId: runner.id, facilityId: fac, completedBy: myStaffId ?? me?.id ?? "staff", status: checked.length === runner.items.length ? "complete" : "incomplete", checkedItemIds: checked, note });
            setRunner(null);
          }}
        />
      )}

      {editor && <ChecklistEditorModal template={editor === "new" ? null : editor} facilities={facilities} onClose={() => setEditor(null)} />}
    </div>
  );
}

/* ------------------------------- editor (CRUD) ---------------------------- */
function ChecklistEditorModal({ template, facilities, onClose }: {
  template: ChecklistTemplate | null;
  facilities: { id: string; name: string }[];
  onClose: () => void;
}) {
  const add = useDemo((s) => s.addChecklistTemplate);
  const update = useDemo((s) => s.updateChecklistTemplate);

  const [name, setName] = useState(template?.name ?? "");
  const [cadence, setCadence] = useState<ChecklistCadence>(template?.cadence ?? "daily");
  const [facilityIds, setFacilityIds] = useState<string[]>(template?.facilityIds ?? []);
  const [items, setItems] = useState<ChecklistItem[]>(template?.items ?? [{ id: uid("cli"), label: "" }]);

  const setItem = (i: number, label: string) => setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, label } : it)));
  const addItem = () => setItems((arr) => [...arr, { id: uid("cli"), label: "" }]);
  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => setItems((arr) => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    const next = [...arr]; [next[i], next[j]] = [next[j], next[i]]; return next;
  });
  const toggleFacility = (id: string) => setFacilityIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));

  const save = () => {
    const cleanItems = items.map((it) => ({ ...it, label: it.label.trim() })).filter((it) => it.label);
    if (!name.trim() || cleanItems.length === 0) return;
    const payload = { name: name.trim(), kind: template?.kind ?? "opening", cadence, facilityIds, items: cleanItems, archived: false };
    if (template) update(template.id, payload);
    else add(payload);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={template ? "Edit checklist" : "New checklist"} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} icon="Check" disabled={!name.trim() || items.every((i) => !i.label.trim())}>Save checklist</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Daily Opening" /></Field>
          <Field label="Frequency"><Select value={cadence} onChange={(e) => setCadence(e.target.value as ChecklistCadence)}>{CADENCES.map((c) => <option key={c} value={c}>{CADENCE_LABEL[c]}</option>)}</Select></Field>
        </div>

        <div>
          <p className="label">Facilities <span className="text-xs font-normal text-slate-400">(none = all facilities)</span></p>
          {facilities.length === 0 ? (
            <p className="text-xs text-slate-400">No facilities yet — this checklist will apply to all facilities once you add one.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {facilities.map((f) => (
                <button key={f.id} type="button" onClick={() => toggleFacility(f.id)}
                  className={cn("rounded-lg border px-3 py-1.5 text-sm", facilityIds.includes(f.id) ? "border-brand-300 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300")}>
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="label">Items</p>
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={it.id} className="flex items-center gap-2">
                <div className="flex flex-col text-slate-300">
                  <button type="button" onClick={() => move(i, -1)} className="hover:text-slate-500" title="Move up"><GripVertical className="h-3.5 w-3.5" /></button>
                </div>
                <Input value={it.label} onChange={(e) => setItem(i, e.target.value)} placeholder={`Item ${i + 1}`} className="flex-1" />
                <button type="button" onClick={() => move(i, 1)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title="Move down">↓</button>
                <button type="button" onClick={() => removeItem(i)} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50" title="Remove"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" icon="Plus" onClick={addItem} className="mt-2">Add item</Button>
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------------- runner ---------------------------------- */
function ChecklistRunnerModal({ template, facilities, onClose, onSubmit }: {
  template: ChecklistTemplate;
  facilities: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (checked: string[], note: string, facilityId: string) => void;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [fac, setFac] = useState(facilities[0]?.id ?? "");
  const toggle = (id: string) => setChecked((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);

  return (
    <Modal open onClose={onClose} title={template.name} description={`${checked.length}/${template.items.length} complete`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSubmit(checked, note, fac)} icon="Check">Submit checklist</Button></>}>
      <div className="space-y-3">
        {facilities.length > 1 && (
          <Field label="Facility"><Select value={fac} onChange={(e) => setFac(e.target.value)}>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
        )}
        <ul className="space-y-2">
          {template.items.map((item) => {
            const on = checked.includes(item.id);
            return (
              <li key={item.id}>
                <button onClick={() => toggle(item.id)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors", on ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700")}>
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-md border-2", on ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300")}>{on && <Check className="h-4 w-4" />}</span>
                  <span className={cn("text-sm", on ? "font-medium text-slate-800 dark:text-slate-100" : "text-slate-600 dark:text-slate-300")}>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <Field label="Notes"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything to flag?" /></Field>
      </div>
    </Modal>
  );
}
