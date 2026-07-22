"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Star, Hash, Megaphone, CalendarDays, AlertTriangle, ArrowRight } from "lucide-react";
import {
  getStaff, staffName, facilityName, relativeTime, CHANNEL_KIND_LABELS, type Message,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { AnnouncementComposer } from "@/components/chat/announcement-composer";
import { StaffAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

export default function MobileChat() {
  const { role } = useAccess();
  const channels = useDemo((s) => s.channels);
  const messages = useDemo((s) => s.messages);
  const [activeId, setActiveId] = useState("ch_all");

  const visible = useMemo(
    () => channels.filter((c) => !c.restrictedToRoles || (role && c.restrictedToRoles.includes(role))),
    [channels, role],
  );
  const active = visible.find((c) => c.id === activeId) ?? visible[0];
  const thread = useMemo(
    () => messages.filter((m) => m.channelId === active?.id).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()),
    [messages, active?.id],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Channel pills */}
      <div className="border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {visible.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium", active?.id === c.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600")}>
              {c.kind === "all_staff" ? <Star className="h-3 w-3" fill="currentColor" /> : <Hash className="h-3 w-3" />}
              {c.name}
            </button>
          ))}
        </div>
        {active && <p className="mt-1.5 px-1 text-[11px] text-slate-400">{active.facilityId ? facilityName(active.facilityId) : CHANNEL_KIND_LABELS[active.kind]}</p>}
      </div>

      {/* Thread */}
      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-3">
        {thread.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No messages yet.</p>}
        {thread.map((m) => <Bubble key={m.id} m={m} />)}
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 bg-white p-2.5">
        {active && <AnnouncementComposer channelId={active.id} />}
      </div>
    </div>
  );
}

function Bubble({ m }: { m: Message }) {
  const sender = getStaff(m.senderId);
  const special = m.kind && ["schedule_publish", "announcement", "weather_alert"].includes(m.kind);
  const urgent = m.priority === "urgent";

  if (special) {
    return (
      <div className={cn("rounded-2xl border p-3", urgent ? "border-rose-200 bg-rose-50" : "border-brand-200 bg-brand-50")}>
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-700">
          {m.kind === "schedule_publish" ? <CalendarDays className="h-3.5 w-3.5" /> : <Megaphone className="h-3.5 w-3.5" />}
          {m.kind === "schedule_publish" ? "Schedule" : "Announcement"}
          {urgent && <span className="chip bg-rose-100 text-rose-700"><AlertTriangle className="h-3 w-3" /> Urgent</span>}
        </div>
        <p className="mt-1.5 text-sm font-medium text-slate-800">{m.body}</p>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
          <span>{staffName(m.senderId)} · {relativeTime(m.sentAt)}</span>
          {m.linkUrl && <Link href={m.linkUrl.includes("schedule") ? "/m/my-schedule" : "/m/home"} className="flex items-center gap-1 font-semibold text-brand-600">Open <ArrowRight className="h-3 w-3" /></Link>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <StaffAvatar name={staffName(m.senderId)} color={sender?.avatarColor ?? "#0E7490"} size="sm" />
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-800">{staffName(m.senderId)}</span>
          <span className="text-[10px] text-slate-400">{relativeTime(m.sentAt)}</span>
        </div>
        <p className="mt-0.5 text-sm text-slate-700">{m.body}</p>
      </div>
    </div>
  );
}
