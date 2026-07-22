"use client";

import Link from "next/link";
import { Sparkles, CalendarRange, Trash2 } from "lucide-react";
import { facilityName, formatShortDate, relativeTime, staffName } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useDemo } from "@/lib/store";
import { PageHeader } from "@/components/ui/page-header";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DRAFT_STATUS_META } from "@/components/schedule/draft-status";

function weekLabel(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start); end.setDate(end.getDate() + 6);
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

export default function DraftsPage() {
  const { can } = useAccess();
  const drafts = useDemo((s) => s.drafts);
  const removeDraft = useDemo((s) => s.removeDraft);

  if (!can("schedule.manage")) return <AccessRestricted />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule Drafts"
        subtitle="Saved auto-generated drafts awaiting review or publication."
        actions={<Link href="/schedule/auto-builder" className="btn-primary"><Sparkles className="h-4 w-4" /> New draft</Link>}
      />

      {drafts.length === 0 ? (
        <EmptyState
          icon="CalendarRange"
          title="No drafts yet"
          description="Generate a draft schedule with the Auto Builder to see it here."
          action={<Link href="/schedule/auto-builder" className="btn-primary"><Sparkles className="h-4 w-4" /> Open Auto Builder</Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drafts.map((d) => {
            const meta = DRAFT_STATUS_META[d.status];
            const filled = d.shifts.filter((s) => s.assignedStaffId).length;
            return (
              <div key={d.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><CalendarRange className="h-5 w-5" /></span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{weekLabel(d.weekStart)}</p>
                      <p className="text-xs text-slate-400">{d.facilityId === "all" ? "All facilities" : facilityName(d.facilityId)}</p>
                    </div>
                  </div>
                  <Badge intent={meta.intent}>{meta.label}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Metric label="Coverage" value={`${d.coverageScore}%`} />
                  <Metric label="Filled" value={`${filled}/${d.shifts.length}`} />
                  <Metric label="Warnings" value={d.warnings.length} />
                </div>
                <p className="mt-3 text-xs text-slate-400">By {staffName(d.generatedBy)} · {relativeTime(d.generatedAt)}</p>
                <div className="mt-4 flex items-center gap-2">
                  <Link href="/schedule/auto-builder" className="btn-secondary flex-1 justify-center">Open builder</Link>
                  <Button variant="ghost" size="sm" onClick={() => removeDraft(d.id)} title="Delete draft"><Trash2 className="h-4 w-4 text-slate-400" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <p className="text-sm font-bold text-slate-800">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
