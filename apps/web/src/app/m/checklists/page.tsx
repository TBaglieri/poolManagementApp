"use client";

import { useState } from "react";
import Link from "next/link";
import { ListChecks, CheckCircle2, Circle, ArrowLeft } from "lucide-react";
import { checklistTemplates, type ChecklistTemplate } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { cn } from "@/lib/cn";

export default function MobileChecklists() {
  const { staffId, facilityId, staff: me } = useAccess();
  const completeChecklist = useDemo((s) => s.completeChecklist);
  const [openId, setOpenId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);

  const homeFacility = facilityId === "all" ? (me?.homeFacilityId ?? "fac_maplewood") : facilityId;
  const templates = checklistTemplates.filter((t) => t.facilityIds.includes(homeFacility));

  const toggle = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }));

  const submit = (t: ChecklistTemplate) => {
    if (!staffId) return;
    const ids = t.items.filter((i) => checked[i.id]).map((i) => i.id);
    completeChecklist({
      templateId: t.id, facilityId: homeFacility, completedBy: staffId,
      status: ids.length === t.items.length ? "complete" : "incomplete", checkedItemIds: ids,
    });
    setSubmittedIds((s) => [...s, t.id]);
    setOpenId(null);
    setChecked({});
  };

  return (
    <div className="pb-6">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/m/home" className="rounded-lg p-1 text-slate-400"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-base font-bold text-slate-900">Checklists</h1>
      </div>

      <div className="space-y-3 px-4 py-4">
        {templates.map((t) => {
          const isOpen = openId === t.id;
          const submitted = submittedIds.includes(t.id);
          const count = t.items.filter((i) => checked[i.id]).length;
          return (
            <div key={t.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <button onClick={() => setOpenId(isOpen ? null : t.id)} className="flex w-full items-center gap-3 p-3 text-left">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", submitted ? "bg-emerald-50 text-emerald-600" : "bg-brand-50 text-brand-600")}>
                  {submitted ? <CheckCircle2 className="h-5 w-5" /> : <ListChecks className="h-5 w-5" />}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                  <p className="text-xs capitalize text-slate-400">{t.cadence.replace("_", " ")} · {t.items.length} items</p>
                </div>
                {submitted && <span className="chip bg-emerald-50 text-emerald-700">Done</span>}
              </button>
              {isOpen && !submitted && (
                <div className="border-t border-slate-100 p-3">
                  <ul className="space-y-1">
                    {t.items.map((i) => (
                      <li key={i.id}>
                        <button onClick={() => toggle(i.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50">
                          {checked[i.id] ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> : <Circle className="h-5 w-5 shrink-0 text-slate-300" />}
                          <span className={cn(checked[i.id] ? "text-slate-400 line-through" : "text-slate-700")}>{i.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => submit(t)} className="btn-primary mt-2 w-full justify-center">
                    Submit ({count}/{t.items.length})
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {templates.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No checklists for your facility.</p>}
      </div>
    </div>
  );
}
