"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Hash, Star, Search, Pin, AlertTriangle, Megaphone, CalendarDays, CloudRain, Users, ArrowRight,
} from "lucide-react";
import {
  getStaff, staffName, facilityName, relativeTime, CHANNEL_KIND_LABELS,
  type Message, type Channel,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { PageHeader } from "@/components/ui/page-header";
import { StaffAvatar } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/ui/badge";
import { AnnouncementComposer } from "@/components/chat/announcement-composer";
import { cn } from "@/lib/cn";

const KIND_ICON: Record<string, { icon: typeof Megaphone; cls: string; label: string }> = {
  schedule_publish: { icon: CalendarDays, cls: "text-brand-600 bg-brand-50 border-brand-200", label: "Schedule" },
  weather_alert: { icon: CloudRain, cls: "text-amber-600 bg-amber-50 border-amber-200", label: "Weather" },
  shift_coverage: { icon: Users, cls: "text-sky-600 bg-sky-50 border-sky-200", label: "Coverage" },
  announcement: { icon: Megaphone, cls: "text-violet-600 bg-violet-50 border-violet-200", label: "Announcement" },
};

export default function ChatPage() {
  const { role, can } = useAccess();
  const channels = useDemo((s) => s.channels);
  const messages = useDemo((s) => s.messages);
  const togglePin = useDemo((s) => s.togglePinMessage);
  const [activeId, setActiveId] = useState("ch_all");
  const [search, setSearch] = useState("");

  const visibleChannels = useMemo(
    () => channels.filter((c) => !c.restrictedToRoles || (role && c.restrictedToRoles.includes(role))),
    [channels, role],
  );
  const active = visibleChannels.find((c) => c.id === activeId) ?? visibleChannels[0];

  const channelMessages = useMemo(() => {
    return messages
      .filter((m) => m.channelId === active?.id)
      .filter((m) => !search || m.body.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  }, [messages, active?.id, search]);

  const pinned = channelMessages.filter((m) => m.pinned);

  return (
    <div className="space-y-5">
      <PageHeader title="Team Chat" subtitle="Announcements & coordination across your whole organization." />

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Channel list */}
        <aside className="card h-fit overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Channels</p>
          </div>
          <ul className="p-2">
            {visibleChannels.map((c) => {
              const unreadDot = c.unread > 0;
              const isAllTeam = c.kind === "all_staff";
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      active?.id === c.id ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {isAllTeam ? <Star className={cn("h-4 w-4 shrink-0", active?.id === c.id ? "text-brand-500" : "text-amber-400")} fill="currentColor" /> : <Hash className="h-4 w-4 shrink-0 text-slate-400" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.name}</span>
                      <span className="block truncate text-xs text-slate-400">{c.facilityId ? facilityName(c.facilityId) : CHANNEL_KIND_LABELS[c.kind]}</span>
                    </span>
                    {unreadDot && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Thread */}
        <section className="card flex h-[calc(100vh-260px)] min-h-[480px] flex-col overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2">
              {active?.kind === "all_staff" ? <Star className="h-4 w-4 text-amber-400" fill="currentColor" /> : <Hash className="h-4 w-4 text-slate-400" />}
              <div>
                <h2 className="text-sm font-semibold text-slate-800">{active?.name}</h2>
                <p className="text-xs text-slate-400">{active?.description}</p>
              </div>
            </div>
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-40 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-sm focus:border-brand-400 focus:bg-white focus:outline-none" />
            </div>
          </header>

          {pinned.length > 0 && (
            <div className="border-b border-amber-100 bg-amber-50/50 px-5 py-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                <Pin className="h-3.5 w-3.5" /> {pinned.length} pinned · {pinned[pinned.length - 1].body.slice(0, 60)}…
              </p>
            </div>
          )}

          <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {channelMessages.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-400">No messages yet. Start the conversation below.</p>
            )}
            {channelMessages.map((m) => (
              <MessageRow key={m.id} message={m} canPin={can("chat.announce")} onPin={() => togglePin(m.id)} />
            ))}
          </div>

          <div className="border-t border-slate-100 p-4">
            {active && <AnnouncementComposer channelId={active.id} />}
          </div>
        </section>
      </div>
    </div>
  );
}

function MessageRow({ message: m, canPin, onPin }: { message: Message; canPin: boolean; onPin: () => void }) {
  const sender = getStaff(m.senderId);
  const special = m.kind && KIND_ICON[m.kind];
  const urgent = m.priority === "urgent";

  if (special) {
    const K = special.icon;
    return (
      <div className={cn("rounded-xl border p-4", special.cls)}>
        <div className="flex items-center gap-2">
          <K className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wide">{special.label}</span>
          {urgent && <span className="chip bg-rose-100 text-rose-700"><AlertTriangle className="h-3 w-3" /> Urgent</span>}
          <span className="ml-auto text-xs text-slate-400">{relativeTime(m.sentAt)}</span>
        </div>
        <p className="mt-2 text-sm font-medium text-slate-800">{m.body}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">{staffName(m.senderId)}</span>
          {m.linkUrl && <Link href={m.linkUrl} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800">View <ArrowRight className="h-3 w-3" /></Link>}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-3">
      <StaffAvatar name={staffName(m.senderId)} color={sender?.avatarColor ?? "#0E7490"} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{staffName(m.senderId)}</span>
          {sender && <RoleBadge role={sender.primaryRole} />}
          <span className="text-xs text-slate-400">{relativeTime(m.sentAt)}</span>
          {m.pinned && <Pin className="h-3 w-3 text-amber-500" />}
          {urgent && <span className="chip bg-rose-50 text-rose-700"><AlertTriangle className="h-3 w-3" /> Urgent</span>}
        </div>
        <p className={cn("mt-0.5 text-sm text-slate-700", urgent && "font-medium")}>{m.body}</p>
      </div>
      {canPin && (
        <button onClick={onPin} className="opacity-0 transition-opacity group-hover:opacity-100" title={m.pinned ? "Unpin" : "Pin"}>
          <Pin className={cn("h-4 w-4", m.pinned ? "text-amber-500" : "text-slate-300 hover:text-slate-500")} />
        </button>
      )}
    </div>
  );
}
