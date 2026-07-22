"use client";

import { useRef, useState } from "react";
import { Building2, Check, ChevronDown, Layers } from "lucide-react";
import { facilities } from "@poolops/shared";
import { useSession } from "@/lib/session";
import { useClickOutside } from "@/lib/use-click-outside";
import { cn } from "@/lib/cn";

export function FacilitySwitcher() {
  const facilityId = useSession((s) => s.facilityId);
  const setFacility = useSession((s) => s.setFacility);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const current = facilities.find((f) => f.id === facilityId);
  const label = current?.name ?? "All Facilities";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {current ? <Building2 className="h-4 w-4 text-brand-600" /> : <Layers className="h-4 w-4 text-brand-600" />}
        <span className="max-w-[10rem] truncate">{label}</span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-2 w-64 animate-scale-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-soft">
          <p className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Switch facility</p>
          <button
            onClick={() => { setFacility("all"); setOpen(false); }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50"
          >
            <span className="flex items-center gap-2 font-medium text-slate-700"><Layers className="h-4 w-4 text-slate-400" /> All Facilities</span>
            {facilityId === "all" && <Check className="h-4 w-4 text-brand-600" />}
          </button>
          <div className="my-1 h-px bg-slate-100" />
          {facilities.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFacility(f.id); setOpen(false); }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50"
            >
              <span className="flex items-center gap-2 truncate text-slate-700">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", f.status === "open" ? "bg-emerald-500" : f.status === "maintenance" ? "bg-amber-500" : "bg-slate-300")} />
                <span className="truncate">{f.name}</span>
              </span>
              {facilityId === f.id && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
