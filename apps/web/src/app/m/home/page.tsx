"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Clock, CalendarDays, MessageSquare, Wrench, ListChecks, FlaskConical, GraduationCap,
  ChevronRight, Megaphone, ArrowRight, ShieldCheck, Users,
} from "lucide-react";
import {
  shifts as seedShifts, facilityName, format24h, formatWeekday, staffName,
  SHIFT_POSITION_LABELS,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { MSection } from "@/components/mobile/mobile-shell";
import { cn } from "@/lib/cn";

const todayKey = new Date().toISOString().slice(0, 10);

export default function MobileHome() {
  const { staff: me, can } = useAccess();
  const shifts = useDemo((s) => s.shifts);
  const messages = useDemo((s) => s.messages);
  const clock = useDemo((s) => s.clock);

  const myShiftToday = useMemo(() => {
    return shifts.find((s) => s.assignedStaffId === me?.id && s.date === todayKey);
  }, [shifts, me?.id]);

  const myClock = clock.find((c) => c.staffId === me?.id && (c.status === "clocked_in" || c.status === "late"));
  const latestAnnouncement = [...messages].reverse().find((m) => m.channelId === "ch_all");
  const isManager = can("schedule.approve") || can("schedule.manage");

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();

  return (
    <div className="pb-4">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-600 to-cyan-600 px-5 pb-6 pt-5 text-white">
        <p className="text-sm text-white/80">{greeting},</p>
        <h1 className="text-2xl font-bold">{me?.firstName} 👋</h1>
        <div className="mt-4 rounded-2xl bg-white/15 p-4 backdrop-blur">
          {myShiftToday ? (
            <>
              <p className="text-xs font-medium text-white/80">Today's shift</p>
              <p className="mt-1 text-lg font-bold">{format24h(myShiftToday.start)} – {format24h(myShiftToday.end)}</p>
              <p className="text-sm text-white/85">{facilityName(myShiftToday.facilityId)} · {SHIFT_POSITION_LABELS[myShiftToday.position]}</p>
            </>
          ) : (
            <>
              <p className="text-xs font-medium text-white/80">Today</p>
              <p className="mt-1 text-lg font-bold">No shift scheduled</p>
              <p className="text-sm text-white/85">Enjoy your day off!</p>
            </>
          )}
          <Link href="/m/clock" className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-brand-700">
            <Clock className="h-4 w-4" /> {myClock ? "Clock out" : "Clock in"}
          </Link>
        </div>
      </div>

      {/* Manager strip */}
      {isManager && (
        <Link href="/m/manager" className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white"><ShieldCheck className="h-5 w-5" /></span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Manager tools</p>
            <p className="text-xs text-slate-500">Approvals, coverage & team status</p>
          </div>
          <ChevronRight className="h-5 w-5 text-brand-400" />
        </Link>
      )}

      {/* Latest announcement */}
      {latestAnnouncement && (
        <MSection title="All Team" action={<Link href="/m/chat" className="text-xs font-medium text-brand-600">View all</Link>}>
          <Link href={latestAnnouncement.linkUrl?.includes("schedule") ? "/m/my-schedule" : "/m/chat"} className="block rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-600">
              <Megaphone className="h-3.5 w-3.5" /> {staffName(latestAnnouncement.senderId)}
            </div>
            <p className="mt-1 text-sm text-slate-700">{latestAnnouncement.body}</p>
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-brand-600">Open <ArrowRight className="h-3 w-3" /></p>
          </Link>
        </MSection>
      )}

      {/* Quick actions */}
      <MSection title="Quick actions">
        <div className="grid grid-cols-3 gap-2.5">
          <Tile href="/m/my-schedule" icon={CalendarDays} label="My schedule" />
          <Tile href="/m/chat" icon={MessageSquare} label="Team chat" />
          <Tile href="/m/checklists" icon={ListChecks} label="Checklists" />
          <Tile href="/m/report" icon={Wrench} label="Report issue" />
          {can("chemicals.log") && <Tile href="/m/chemicals" icon={FlaskConical} label="Log chem" />}
          {can("lessons.attendance") && <Tile href="/m/classes" icon={GraduationCap} label="My classes" />}
          {isManager && <Tile href="/m/manager" icon={Users} label="Team" />}
        </div>
      </MSection>
    </div>
  );
}

function Tile({ href, icon: Icon, label }: { href: string; icon: typeof Clock; label: string }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-2 py-3 text-center")}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-4 w-4" /></span>
      <span className="text-[11px] font-medium text-slate-600">{label}</span>
    </Link>
  );
}
