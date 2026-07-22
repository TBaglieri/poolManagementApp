"use client";

import { useMemo, useState } from "react";
import { GraduationCap, Clock, Users, CheckCircle2, Circle } from "lucide-react";
import {
  lessonClasses, lessonRegistrations, facilityName, staffName, getStaff,
  format24h, LESSON_LEVEL_LABELS, formatShortDate, type LessonClass,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { StaffAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/lib/cn";

const LEVEL_INTENT: Record<string, "info" | "success" | "warning" | "brand" | "neutral"> = {
  beginner: "info", intermediate: "brand", advanced: "success", private: "warning", parent_child: "neutral",
};

export default function LessonsPage() {
  const { can, staff: me, facilityId } = useAccess();
  const [activeClass, setActiveClass] = useState<string | null>(null);

  // Swim instructors see their own classes; managers see all.
  const isInstructor = me?.primaryRole === "swim_instructor";
  const classes = useMemo(() => lessonClasses.filter((c) => {
    if (facilityId !== "all" && c.facilityId !== facilityId) return false;
    if (isInstructor) return c.instructorId === me?.id;
    return true;
  }), [facilityId, isInstructor, me?.id]);

  if (!can("lessons.view")) return <AccessRestricted />;

  const totalEnrolled = classes.reduce((s, c) => s + c.enrolled, 0);
  const totalCapacity = classes.reduce((s, c) => s + c.capacity, 0);
  const selected = classes.find((c) => c.id === activeClass) ?? classes[0];
  const roster = lessonRegistrations.filter((r) => r.classId === selected?.id);

  return (
    <div className="space-y-6">
      <PageHeader title={isInstructor ? "My Classes" : "Lessons & Classes"} subtitle="Swim lesson programs, rosters, attendance, and student progress." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active classes" value={classes.length} icon="GraduationCap" intent="brand" />
        <StatCard label="Enrolled students" value={totalEnrolled} icon="Users" intent="info" />
        <StatCard label="Capacity used" value={`${totalCapacity ? Math.round((totalEnrolled / totalCapacity) * 100) : 0}%`} icon="TrendingUp" intent="success" hint={`${totalEnrolled}/${totalCapacity}`} />
        <StatCard label="Instructors" value={new Set(classes.map((c) => c.instructorId)).size} icon="UserCheck" intent="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <SectionCard title="Classes" subtitle={`${classes.length} scheduled`}>
          <div className="space-y-2.5">
            {classes.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No classes for this view.</p>}
            {classes.map((c) => <ClassRow key={c.id} c={c} active={selected?.id === c.id} onClick={() => setActiveClass(c.id)} />)}
          </div>
        </SectionCard>

        <SectionCard title="Roster & progress" subtitle={selected?.name}>
          {!selected ? <p className="py-6 text-center text-sm text-slate-400">Select a class.</p> : (
            <>
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                <StaffAvatar name={staffName(selected.instructorId)} color={getStaff(selected.instructorId)?.avatarColor ?? "#0E7490"} size="sm" />
                <div>
                  <p className="font-medium text-slate-700">{staffName(selected.instructorId)}</p>
                  <p className="text-xs text-slate-400">{selected.dayOfWeek} · {format24h(selected.start)}–{format24h(selected.end)}</p>
                </div>
              </div>
              {roster.length === 0 ? <p className="py-4 text-center text-sm text-slate-400">No students enrolled yet.</p> : (
                <ul className="space-y-3">
                  {roster.map((r) => {
                    const present = r.attendance.filter((a) => a.present).length;
                    const latest = r.progressNotes[r.progressNotes.length - 1];
                    return (
                      <li key={r.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-800">{r.studentName} <span className="text-xs font-normal text-slate-400">· age {r.studentAge}</span></p>
                          <span className="chip bg-slate-100 text-slate-500">{present}/{r.attendance.length} present</span>
                        </div>
                        <div className="mt-2 flex gap-1">
                          {r.attendance.map((a, i) => (
                            <span key={i} title={formatShortDate(a.date)}>
                              {a.present ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-slate-300" />}
                            </span>
                          ))}
                        </div>
                        {latest && <p className="mt-2 text-xs text-slate-500">📝 {latest.note}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
              {can("lessons.attendance") && (
                <p className="mt-4 text-xs text-slate-400">Instructors take attendance & add progress notes from the mobile app on the deck.</p>
              )}
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function ClassRow({ c, active, onClick }: { c: LessonClass; active: boolean; onClick: () => void }) {
  const full = c.enrolled >= c.capacity;
  return (
    <button onClick={onClick} className={cn("w-full rounded-xl border p-3 text-left transition-colors", active ? "border-brand-400 bg-brand-50/40" : "border-slate-200 hover:bg-slate-50")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><GraduationCap className="h-4 w-4" /></span>
          <div>
            <p className="text-sm font-semibold text-slate-800">{c.name}</p>
            <p className="text-xs text-slate-400">{facilityName(c.facilityId)} · {c.dayOfWeek}</p>
          </div>
        </div>
        <Badge intent={LEVEL_INTENT[c.level]}>{LESSON_LEVEL_LABELS[c.level]}</Badge>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <span className="flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" /> {format24h(c.start)}–{format24h(c.end)}</span>
        <span className="flex items-center gap-1 text-xs text-slate-500"><Users className="h-3.5 w-3.5" /> {c.enrolled}/{c.capacity}</span>
        <span className="ml-auto w-24"><ProgressBar value={(c.enrolled / c.capacity) * 100} intent={full ? "warning" : "brand"} size="sm" /></span>
      </div>
    </button>
  );
}
