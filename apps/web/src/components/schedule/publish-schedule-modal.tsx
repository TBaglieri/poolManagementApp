"use client";

import { Megaphone, Bell, Smartphone, Mail, CheckCircle2 } from "lucide-react";
import type { ScheduleDraft } from "@poolops/scheduling";
import { useDemo } from "@/lib/store";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export function PublishScheduleModal({
  open, onClose, draft, onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  draft: ScheduleDraft;
  onConfirm: () => void;
}) {
  const settings = useDemo((s) => s.scheduleSettings);
  const assigned = draft.shifts.filter((s) => s.assignedStaffId).length;
  const open_ = draft.shifts.filter((s) => !s.assignedStaffId).length;

  const effects = [
    { on: true, icon: Smartphone, text: `Convert ${assigned} draft shifts into published shifts on web & mobile` },
    { on: settings.autoPostToAllTeam, icon: Megaphone, text: "Post a “Schedule published” announcement to the All Team channel" },
    { on: settings.notifyInApp, icon: Bell, text: `Send in-app notifications to ${assigned} assigned staff` },
    { on: settings.emailSms, icon: Mail, text: "Send email / SMS notifications (placeholder integration)" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Approve & publish schedule"
      description={`Week of ${draft.weekStart} · coverage ${draft.coverageScore}%`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="Send" onClick={onConfirm}>Publish schedule</Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        Publishing will notify all assigned staff, post an announcement to All Team, and update the mobile app schedule.
      </p>
      <div className="mt-4 space-y-2.5">
        {effects.map((e, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm">
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${e.on ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-300"}`}>
              <e.icon className="h-4 w-4" />
            </span>
            <span className={e.on ? "text-slate-700" : "text-slate-400 line-through"}>{e.text}</span>
          </div>
        ))}
      </div>
      {open_ > 0 && (
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {open_} shift{open_ > 1 ? "s" : ""} will be published as <strong>open shifts</strong> for staff to pick up.
        </div>
      )}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        {draft.avoidedConflicts.filter((c) => c.type === "time_off").length} approved time-off request(s) were respected in this draft.
      </div>
    </Modal>
  );
}
