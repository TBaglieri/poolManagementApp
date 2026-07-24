"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Layers } from "lucide-react";
import { useSession } from "@/lib/session";
import { useTenantSeed } from "@/lib/tenant-data";
import { useClickOutside } from "@/lib/use-click-outside";
import { cn } from "@/lib/cn";

export function FacilitySwitcher() {
  const facilityId = useSession((s) => s.facilityId);
  const setFacility = useSession((s) => s.setFacility);
  // The TENANT's own facilities (empty for a fresh real tenant — never demo data).
  const { facilities } = useTenantSeed();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  // Reconcile a stale selection: if the persisted facilityId no longer matches any
  // of this tenant's facilities (e.g. a deleted facility, or a leftover demo id),
  // reset to "all" so data pages don't silently filter to nothing — and so the
  // single-facility view below isn't a dead end.
  useEffect(() => {
    if (facilityId !== "all" && facilities.length > 0 && !facilities.some((f) => f.id === facilityId)) {
      setFacility("all");
    }
  }, [facilities, facilityId, setFacility]);

  // No facilities yet → nothing to switch.
  if (facilities.length === 0) return null;

  // Single-facility tenant → just show the pool's name; "All Facilities" and a
  // switcher are pointless. (Automatic — based on the tenant's facility count.)
  if (facilities.length === 1) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <Building2 className="h-4 w-4 text-brand-600" />
        <span className="max-w-[12rem] truncate">{facilities[0].name}</span>
      </div>
    );
  }

  const current = facilities.find((f) => f.id === facilityId);
  const label = current?.name ?? "All Facilities";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        {current ? <Building2 className="h-4 w-4 text-brand-600" /> : <Layers className="h-4 w-4 text-brand-600" />}
        <span className="max-w-[10rem] truncate">{label}</span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-2 w-64 animate-scale-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-soft dark:border-slate-700 dark:bg-slate-800">
          <p className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Switch facility</p>
          <button
            onClick={() => { setFacility("all"); setOpen(false); }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200"><Layers className="h-4 w-4 text-slate-400" /> All Facilities</span>
            {facilityId === "all" && <Check className="h-4 w-4 text-brand-600" />}
          </button>
          <div className="my-1 h-px bg-slate-100 dark:bg-slate-700" />
          {facilities.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFacility(f.id); setOpen(false); }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <span className="flex items-center gap-2 truncate text-slate-700 dark:text-slate-200">
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
