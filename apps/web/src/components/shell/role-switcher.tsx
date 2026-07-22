"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Monitor, Smartphone, UserCog } from "lucide-react";
import { ROLE_LIST, getRole, type RoleSlug } from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useSession } from "@/lib/session";
import { useClickOutside } from "@/lib/use-click-outside";
import { RoleBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export function RoleSwitcher() {
  const router = useRouter();
  const { role, staff } = useAccess();
  const setRole = useSession((s) => s.setRole);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  if (!role) return null;
  const meta = getRole(role);

  const pick = (slug: RoleSlug) => {
    setRole(slug);
    setOpen(false);
    if (getRole(slug).surface === "mobile") router.push("/m/home");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 px-2.5 py-1.5 text-sm hover:bg-brand-50"
        title="Demo: switch role"
      >
        <UserCog className="h-4 w-4 text-brand-600" />
        <span className="hidden font-medium text-brand-700 sm:inline">{meta.shortName}</span>
        <ChevronDown className={cn("h-4 w-4 text-brand-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 animate-scale-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-soft">
          <div className="px-2.5 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Demo role switcher</p>
            <p className="mt-0.5 text-xs text-slate-400">Preview the product from any access level.</p>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {ROLE_LIST.map((r) => (
              <button
                key={r.slug}
                onClick={() => pick(r.slug)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <RoleBadge role={r.slug} />
                    {r.surface === "mobile" ? <Smartphone className="h-3 w-3 text-slate-300" /> : r.surface === "both" ? <span className="flex gap-0.5"><Monitor className="h-3 w-3 text-slate-300" /><Smartphone className="h-3 w-3 text-slate-300" /></span> : <Monitor className="h-3 w-3 text-slate-300" />}
                  </span>
                  <span className="mt-1 block truncate text-xs text-slate-400">{r.name}</span>
                </span>
                {role === r.slug && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
              </button>
            ))}
          </div>
          {staff && (
            <div className="mt-1 border-t border-slate-100 px-2.5 py-2 text-xs text-slate-400">
              Acting as <span className="font-medium text-slate-600">{staff.firstName} {staff.lastName}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
