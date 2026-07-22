"use client";

import Link from "next/link";
import { GraduationCap, Clock, Users, ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import {
  lessonClasses, lessonRegistrations, facilityName, format24h, LESSON_LEVEL_LABELS,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { AccessRestricted } from "@/components/ui/permission-gate";

export default function MobileClasses() {
  const { can, staff: me } = useAccess();
  if (!can("lessons.view")) return <div className="p-4"><AccessRestricted /></div>;

  const myClasses = lessonClasses.filter((c) => c.instructorId === me?.id);
  const classes = myClasses.length ? myClasses : lessonClasses;

  return (
    <div className="pb-6">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/m/home" className="rounded-lg p-1 text-slate-400"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-base font-bold text-slate-900">My Classes</h1>
      </div>

      <div className="space-y-3 px-4 py-4">
        {classes.map((c) => {
          const roster = lessonRegistrations.filter((r) => r.classId === c.id);
          return (
            <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><GraduationCap className="h-4 w-4" /></span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">{facilityName(c.facilityId)}</p>
                  </div>
                </div>
                <span className="chip bg-slate-100 text-slate-500">{LESSON_LEVEL_LABELS[c.level]}</span>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {c.dayOfWeek} {format24h(c.start)}</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c.enrolled}/{c.capacity}</span>
              </div>
              {roster.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Take attendance</p>
                  <ul className="space-y-1">
                    {roster.map((r) => (
                      <li key={r.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                        <span className="text-slate-700">{r.studentName}</span>
                        <span className="flex gap-2 text-slate-300">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          <Circle className="h-5 w-5" />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
