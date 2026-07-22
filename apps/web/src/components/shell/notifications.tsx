"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { relativeTime, type NotificationKind } from "@poolops/shared";
import { useDemo } from "@/lib/store";
import { useClickOutside } from "@/lib/use-click-outside";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const KIND_STYLE: Record<NotificationKind, { icon: string; cls: string }> = {
  approval: { icon: "CheckCheck", cls: "bg-brand-50 text-brand-600" },
  alert: { icon: "TriangleAlert", cls: "bg-rose-50 text-rose-600" },
  reminder: { icon: "Clock", cls: "bg-amber-50 text-amber-600" },
  message: { icon: "MessageSquare", cls: "bg-sky-50 text-sky-600" },
  system: { icon: "Settings", cls: "bg-slate-100 text-slate-500" },
};

export function NotificationsBell() {
  const notifications = useDemo((s) => s.notifications);
  const markRead = useDemo((s) => s.markNotificationsRead);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[22rem] animate-scale-in rounded-xl border border-slate-200 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            {unread > 0 && (
              <button onClick={markRead} className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800">
                <Check className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 divide-y divide-slate-50 overflow-y-auto scrollbar-thin">
            {notifications.map((n) => {
              const k = KIND_STYLE[n.kind];
              const body = (
                <div className={cn("flex gap-3 px-4 py-3 transition-colors hover:bg-slate-50", !n.read && "bg-brand-50/30")}>
                  <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", k.cls)}>
                    <Icon name={k.icon} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{relativeTime(n.at)}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                </div>
              );
              return n.href ? (
                <Link key={n.id} href={n.href} onClick={() => setOpen(false)}>{body}</Link>
              ) : (
                <div key={n.id}>{body}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
