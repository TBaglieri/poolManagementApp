"use client";

import { useState } from "react";
import { Send, Megaphone, AlertTriangle, ChevronDown, Lock } from "lucide-react";
import { MESSAGE_TEMPLATE_LABELS, type MessageKind, type MessageTemplateKey } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { cn } from "@/lib/cn";

const TEMPLATES: Record<MessageTemplateKey, { body: string; kind: MessageKind; urgent?: boolean }> = {
  weather_delay: { body: "⛈️ Weather delay in effect. Clear the pool and shelter patrons. Stand by for the all-clear here.", kind: "weather_alert", urgent: true },
  shift_reminder: { body: "⏰ Reminder: please arrive 10 minutes before your shift and complete your stand checklist.", kind: "message" },
  missing_certification: { body: "🎓 Certification reminder: a required certification is expiring soon. Please renew and upload it before your next shift.", kind: "message" },
  emergency_closing: { body: "🚨 Emergency closing in effect. Evacuate the facility calmly and report to your manager.", kind: "weather_alert", urgent: true },
  pool_closed: { body: "🚫 The pool is temporarily closed. We'll post an update here as soon as it reopens.", kind: "message" },
  schedule_published: { body: "📅 Next week's schedule has been published. Please review your assigned shifts in My Schedule.", kind: "schedule_publish" },
};

export function AnnouncementComposer({ channelId }: { channelId: string }) {
  const { can, staffId } = useAccess();
  const postMessage = useDemo((s) => s.postMessage);
  const allowComments = useDemo((s) => s.scheduleSettings.allowStaffComments);
  const [body, setBody] = useState("");
  const [announce, setAnnounce] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [tmplOpen, setTmplOpen] = useState(false);

  const canAnnounce = can("chat.announce");
  const canPost = canAnnounce || allowComments;

  if (!canPost) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        <Lock className="h-4 w-4" /> Read-only — staff comments are turned off for this channel.
      </div>
    );
  }

  const submit = () => {
    if (!body.trim() || !staffId) return;
    postMessage(channelId, staffId, body.trim(), {
      kind: announce ? "announcement" : "message",
      priority: urgent ? "urgent" : "normal",
      pinned: announce && urgent,
    });
    setBody(""); setAnnounce(false); setUrgent(false);
  };

  const applyTemplate = (key: MessageTemplateKey) => {
    const t = TEMPLATES[key];
    setBody(t.body);
    setAnnounce(true);
    setUrgent(!!t.urgent);
    setTmplOpen(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card">
      {canAnnounce && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button onClick={() => setAnnounce((v) => !v)}
            className={cn("chip border transition-colors", announce ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
            <Megaphone className="h-3.5 w-3.5" /> Announcement
          </button>
          <button onClick={() => setUrgent((v) => !v)}
            className={cn("chip border transition-colors", urgent ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
            <AlertTriangle className="h-3.5 w-3.5" /> Urgent
          </button>
          <div className="relative">
            <button onClick={() => setTmplOpen((v) => !v)} className="chip border border-slate-200 text-slate-500 hover:bg-slate-50">
              Templates <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {tmplOpen && (
              <div className="absolute bottom-full z-20 mb-1 w-56 animate-scale-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-soft">
                {(Object.keys(TEMPLATES) as MessageTemplateKey[]).map((k) => (
                  <button key={k} onClick={() => applyTemplate(k)} className="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                    {MESSAGE_TEMPLATE_LABELS[k]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
          rows={2}
          placeholder={canAnnounce ? "Write a message or announcement… (⌘/Ctrl+Enter to send)" : "Write a message…"}
          className="input min-h-[44px] flex-1 resize-none"
        />
        <button onClick={submit} disabled={!body.trim()} className="btn-primary h-11 px-4">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
