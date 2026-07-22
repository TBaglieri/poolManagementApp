"use client";

import { useState } from "react";
import { Clock, MapPin, CheckCircle2, Coffee } from "lucide-react";
import { facilityName, formatTime, format24h } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { MSection } from "@/components/mobile/mobile-shell";
import { cn } from "@/lib/cn";

export default function MobileClock() {
  const { staff: me, facilityId } = useAccess();
  const clock = useDemo((s) => s.clock);
  const toggleClock = useDemo((s) => s.toggleClock);
  const [now, setNow] = useState(() => new Date());

  const homeFacility = me?.homeFacilityId ?? "fac_maplewood";
  const myActive = clock.find((c) => c.staffId === me?.id && (c.status === "clocked_in" || c.status === "late"));
  const myEntries = clock.filter((c) => c.staffId === me?.id).slice(0, 6);

  const handleToggle = () => {
    if (!me) return;
    toggleClock(me.id, facilityId === "all" ? homeFacility : facilityId);
    setNow(new Date());
  };

  const clockedIn = !!myActive;

  return (
    <div className="pb-4">
      <div className="bg-white px-5 pb-4 pt-4 text-center">
        <p className="text-sm text-slate-500">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900">{now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
        <p className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-400"><MapPin className="h-3.5 w-3.5" /> {facilityName(facilityId === "all" ? homeFacility : facilityId)}</p>
      </div>

      <div className="px-5 py-4">
        <button
          onClick={handleToggle}
          className={cn(
            "flex w-full flex-col items-center gap-2 rounded-3xl py-8 text-white shadow-lift transition-transform active:scale-[0.98]",
            clockedIn ? "bg-gradient-to-br from-rose-500 to-rose-600" : "bg-gradient-to-br from-emerald-500 to-emerald-600",
          )}
        >
          <Clock className="h-10 w-10" />
          <span className="text-xl font-bold">{clockedIn ? "Clock Out" : "Clock In"}</span>
          {clockedIn && myActive?.clockIn && (
            <span className="text-sm text-white/85">In since {formatTime(myActive.clockIn)}</span>
          )}
        </button>

        {clockedIn && (
          <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600">
            <Coffee className="h-4 w-4" /> Start break
          </button>
        )}
      </div>

      <MSection title="Recent punches">
        {myEntries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-6 text-center text-sm text-slate-400">No punches yet today.</p>
        ) : (
          <ul className="space-y-2">
            {myEntries.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", e.clockOut ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-600")}>
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{facilityName(e.facilityId)}</p>
                  <p className="text-xs text-slate-400">
                    {e.clockIn ? formatTime(e.clockIn) : "—"} {e.clockOut ? `– ${formatTime(e.clockOut)}` : "· active"}
                  </p>
                </div>
                <span className={cn("chip", e.flagged ? "bg-amber-50 text-amber-700" : e.clockOut ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700")}>
                  {e.status.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </MSection>
    </div>
  );
}
