"use client";

import { useMemo, useState } from "react";
import { FileText, Lock, Download, CheckCircle2, Search, ShieldAlert } from "lucide-react";
import {
  documents, staffName, formatDate, DOCUMENT_CATEGORY_LABELS, type Document,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

const FILE_INTENT: Record<string, string> = {
  pdf: "bg-rose-50 text-rose-600", docx: "bg-sky-50 text-sky-600",
  xlsx: "bg-emerald-50 text-emerald-600", png: "bg-violet-50 text-violet-600", jpg: "bg-violet-50 text-violet-600",
};

export default function DocumentsPage() {
  const { can, role } = useAccess();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  // Respect document visibility: sensitive docs only for explicitly-allowed roles.
  const visible = useMemo(() => documents.filter((d) => {
    if (d.visibleToRoles.length === 0) return true;
    return role ? d.visibleToRoles.includes(role) : false;
  }), [role]);

  if (!can("documents.view")) return <AccessRestricted />;

  const categories = Array.from(new Set(visible.map((d) => d.category)));
  const filtered = visible
    .filter((d) => category === "all" || d.category === category)
    .filter((d) => !query || d.name.toLowerCase().includes(query.toLowerCase()) || d.tags.some((t) => t.includes(query.toLowerCase())));

  const hiddenSensitive = documents.length - visible.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Library"
        subtitle="Handbooks, safety procedures, SDS sheets, permits, and more — filtered by your access level."
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents…" className="input w-56 pl-8" />
          </div>
        }
      />

      {hiddenSensitive > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
          <Lock className="h-4 w-4" /> {hiddenSensitive} sensitive document{hiddenSensitive > 1 ? "s are" : " is"} hidden from your role (tax forms, payroll registers, etc.).
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <CatChip label="All" value="all" active={category === "all"} onClick={() => setCategory("all")} />
        {categories.map((c) => (
          <CatChip key={c} label={DOCUMENT_CATEGORY_LABELS[c]} value={c} active={category === c} onClick={() => setCategory(c)} />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((d) => <DocCard key={d.id} d={d} />)}
        {filtered.length === 0 && <p className="col-span-full py-10 text-center text-sm text-slate-400">No documents match your filters.</p>}
      </div>
    </div>
  );
}

function CatChip({ label, active, onClick }: { label: string; value: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("chip border transition-colors", active ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
      {label}
    </button>
  );
}

function DocCard({ d }: { d: Document }) {
  return (
    <div className="card card-hover flex flex-col p-5">
      <div className="flex items-start justify-between">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold uppercase", FILE_INTENT[d.fileType] ?? "bg-slate-100 text-slate-500")}>
          {d.fileType}
        </span>
        <div className="flex items-center gap-1.5">
          {d.sensitive && <span title="Sensitive"><ShieldAlert className="h-4 w-4 text-amber-500" /></span>}
          {d.requiresAcknowledgment && <span title="Requires acknowledgment"><CheckCircle2 className="h-4 w-4 text-brand-500" /></span>}
        </div>
      </div>
      <h3 className="mt-3 font-semibold text-slate-800">{d.name}</h3>
      <p className="mt-0.5 text-xs text-slate-400">{DOCUMENT_CATEGORY_LABELS[d.category]} · {(d.sizeKb / 1024).toFixed(1)} MB</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {d.tags.map((t) => <span key={t} className="chip bg-slate-100 text-slate-500">{t}</span>)}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
        <span>{staffName(d.uploadedBy)} · {formatDate(d.uploadedAt)}</span>
        <button className="inline-flex items-center gap-1 font-medium text-brand-700 hover:text-brand-800" title="Signed URL in production">
          <Download className="h-3.5 w-3.5" /> Open
        </button>
      </div>
      {d.sensitive && <p className="mt-2 text-[11px] text-amber-600">Served via short-lived signed URL in production.</p>}
    </div>
  );
}
