"use client";

import { useState } from "react";
import { Plane, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import {
  staff as allStaff, staffName, format24h, formatWeekday, formatShortDate,
  SHIFT_POSITION_LABELS, type Shift, type StaffProfile, type TimeOffRequest,
} from "@poolops/shared";
import { useDemo } from "@/lib/store";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

type Which = "timeoff" | "trade";

const TIME_OFF_TYPES: TimeOffRequest["type"][] = ["vacation", "sick", "personal", "school", "other"];
const todayKey = () => new Date().toISOString().slice(0, 10);

/**
 * Staff-facing "Request time off" and "Request a sub / swap" actions.
 * Both create a *pending* request that appears in the manager's approval queue
 * (Schedule → Time-off requests / Shift trades) and persist in supabase mode.
 */
export function StaffRequestButtons({ me, myShifts }: { me: StaffProfile; myShifts: Shift[] }) {
  const addTimeOff = useDemo((s) => s.addTimeOff);
  const addTrade = useDemo((s) => s.addTrade);
  const [open, setOpen] = useState<Which | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setOpen("timeoff")} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition-shadow hover:shadow-soft">
          <Plane className="h-4 w-4 text-brand-600" /> Request time off
        </button>
        <button onClick={() => setOpen("trade")} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition-shadow hover:shadow-soft">
          <ArrowLeftRight className="h-4 w-4 text-brand-600" /> Request sub / swap
        </button>
      </div>

      {open === "timeoff" && (
        <TimeOffModal me={me} onClose={() => setOpen(null)} onSubmit={addTimeOff} />
      )}
      {open === "trade" && (
        <TradeModal me={me} myShifts={myShifts} onClose={() => setOpen(null)} onSubmit={addTrade} />
      )}
    </>
  );
}

function TimeOffModal({
  me, onClose, onSubmit,
}: {
  me: StaffProfile;
  onClose: () => void;
  onSubmit: (r: { staffId: string; startDate: string; endDate: string; reason: string; type: TimeOffRequest["type"] }) => void;
}) {
  const [form, setForm] = useState({ startDate: todayKey(), endDate: todayKey(), type: "vacation" as TimeOffRequest["type"], reason: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = () => {
    if (!form.startDate || !form.endDate) return setError("Pick a start and end date.");
    if (form.endDate < form.startDate) return setError("End date can't be before the start date.");
    if (!form.reason.trim()) return setError("Add a short reason so your manager has context.");
    setError(null);
    setSubmitting(true);
    onSubmit({ staffId: me.id, startDate: form.startDate, endDate: form.endDate, reason: form.reason.trim(), type: form.type });
    setSubmitting(false);
    setDone(true);
  };

  return (
    <Modal open onClose={onClose} title="Request time off" size="md"
      footer={done
        ? <Button onClick={onClose}>Done</Button>
        : <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={submitting} icon="Send">{submitting ? "Submitting…" : "Submit request"}</Button></>}>
      {done ? (
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <p className="mt-3 font-semibold text-slate-800">Request submitted</p>
          <p className="text-sm text-slate-500">{formatShortDate(form.startDate)} → {formatShortDate(form.endDate)} · {form.type}. Your manager will review it.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date"><Input type="date" value={form.startDate} min={todayKey()} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="End date"><Input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
          </div>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TimeOffRequest["type"] })}>
              {TIME_OFF_TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
            </Select>
          </Field>
          <Field label="Reason"><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Family trip — back Monday" /></Field>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

function TradeModal({
  me, myShifts, onClose, onSubmit,
}: {
  me: StaffProfile;
  myShifts: Shift[];
  onClose: () => void;
  onSubmit: (r: { shiftId: string; requestedBy: string; requestedTo: string | null; reason: string }) => void;
}) {
  const [shiftId, setShiftId] = useState(myShifts[0]?.id ?? "");
  const [requestedTo, setRequestedTo] = useState<string>(""); // "" = open to anyone
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Colleagues you could hand the shift to: same home facility, not you.
  const colleagues = allStaff.filter((s) => s.id !== me.id && s.homeFacilityId === me.homeFacilityId);

  const submit = () => {
    if (!shiftId) return setError("Select one of your shifts to give up.");
    if (!reason.trim()) return setError("Add a reason so your manager and teammates have context.");
    setError(null);
    setSubmitting(true);
    onSubmit({ shiftId, requestedBy: me.id, requestedTo: requestedTo || null, reason: reason.trim() });
    setSubmitting(false);
    setDone(true);
  };

  return (
    <Modal open onClose={onClose} title="Request a sub / swap" size="md"
      footer={done
        ? <Button onClick={onClose}>Done</Button>
        : <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={submitting || myShifts.length === 0} icon="Send">{submitting ? "Submitting…" : "Submit request"}</Button></>}>
      {done ? (
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <p className="mt-3 font-semibold text-slate-800">Request submitted</p>
          <p className="text-sm text-slate-500">{requestedTo ? `Sent to ${staffName(requestedTo)}.` : "Open for anyone to pick up."} A manager approves the final swap.</p>
        </div>
      ) : myShifts.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">You have no upcoming shifts to trade.</p>
      ) : (
        <div className="space-y-4">
          <Field label="Shift to give up">
            <Select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
              {myShifts.map((s) => (
                <option key={s.id} value={s.id}>{formatWeekday(s.date)} {formatShortDate(s.date)} · {format24h(s.start)}–{format24h(s.end)} · {SHIFT_POSITION_LABELS[s.position]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Ask a specific teammate (optional)">
            <Select value={requestedTo} onChange={(e) => setRequestedTo(e.target.value)}>
              <option value="">Open to anyone</option>
              {colleagues.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
            </Select>
          </Field>
          <Field label="Reason"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Doctor's appointment that morning" /></Field>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
