"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown } from "lucide-react";
import type { PermissionKey } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useClickOutside } from "@/lib/use-click-outside";
import { Icon } from "@/components/ui/icon";

interface Action { label: string; icon: string; href: string; perm: PermissionKey }

const ACTIONS: Action[] = [
  { label: "Create shift", icon: "CalendarPlus", href: "/schedule?new=1", perm: "schedule.manage" },
  { label: "Invite employee", icon: "UserPlus", href: "/staff?invite=1", perm: "staff.invite" },
  { label: "Log chemicals", icon: "FlaskConical", href: "/chemicals?new=1", perm: "chemicals.log" },
  { label: "New announcement", icon: "Megaphone", href: "/chat?compose=1", perm: "chat.announce" },
  { label: "Report issue", icon: "Wrench", href: "/maintenance?new=1", perm: "maintenance.report" },
  { label: "Upload document", icon: "Upload", href: "/documents?upload=1", perm: "documents.manage" },
  { label: "Export timesheets", icon: "Download", href: "/payroll?export=1", perm: "payroll.export" },
];

export function QuickActions() {
  const router = useRouter();
  const { can } = useAccess();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const available = ACTIONS.filter((a) => can(a.perm));
  if (available.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="btn-primary">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Quick action</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-80" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 animate-scale-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-soft">
          {available.map((a) => (
            <button
              key={a.label}
              onClick={() => { router.push(a.href); setOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name={a.icon} className="h-4 w-4" />
              </span>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
