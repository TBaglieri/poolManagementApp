"use client";

import Link from "next/link";
import {
  Building2, ShieldCheck, KeyRound, CreditCard, CalendarCheck, Megaphone, Bell, Mail,
  MessageSquare, ChevronRight, Database,
} from "lucide-react";
import { organization, ORG_TYPE_LABELS } from "@poolops/shared";
import { getSyncStatus, getEffectiveDataMode } from "@poolops/supabase";
import { useAccess } from "@/lib/access";
import { useDemo, type ScheduleSettings } from "@/lib/store";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { PermissionGate } from "@/components/ui/permission-gate";
import { cn } from "@/lib/cn";

const SCHEDULE_TOGGLES: { key: keyof ScheduleSettings; label: string; desc: string; icon: typeof Megaphone }[] = [
  { key: "autoPostToAllTeam", label: "Auto-post published schedules to All Team", desc: "When a schedule is published, post a “Schedule published” announcement to the All Team channel.", icon: Megaphone },
  { key: "allowStaffComments", label: "Allow staff comments on announcements", desc: "Let staff reply to announcements in channels they can read.", icon: MessageSquare },
  { key: "notifyInApp", label: "Notify staff by in-app notification", desc: "Send each assigned staff member an in-app notification when schedules publish.", icon: Bell },
  { key: "emailSms", label: "Email / SMS notifications", desc: "Send email & SMS on publish (placeholder — requires provider setup).", icon: Mail },
];

export default function SettingsPage() {
  const { roleMeta } = useAccess();
  const settings = useDemo((s) => s.scheduleSettings);
  const setSetting = useDemo((s) => s.setScheduleSetting);
  const syncStatus = getSyncStatus();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Organization, scheduling, access, and billing configuration." />

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SettingLink href="/settings/roles" icon={ShieldCheck} title="Roles" desc="12 access levels" perm="settings.view" />
        <SettingLink href="/settings/permissions" icon={KeyRound} title="Permissions" desc="Role permission matrix" perm="permissions.manage" />
        <SettingLink href="/settings/subscription" icon={CalendarCheck} title="Subscription" desc="Plan & usage" perm="settings.manage" />
        <SettingLink href="/billing" icon={CreditCard} title="Billing" desc="Invoices & payment" perm="settings.manage" />
      </div>

      {/* Organization */}
      <SectionCard title="Organization" icon={<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Building2 className="h-4 w-4" /></span>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Name" value={organization.name} />
          <Info label="Type" value={ORG_TYPE_LABELS[organization.type]} />
          <Info label="Timezone" value={organization.timezone} />
          <Info label="Plan" value={organization.plan} />
          <Info label="Your role" value={roleMeta?.name ?? "—"} />
          <Info label="Accent color" value={organization.accentColor} />
        </div>
        <PermissionGate anyOf={["settings.manage"]}>
          <p className="mt-4 text-xs text-slate-400">Organization editing is available to admins. (Form fields are read-only in this demo.)</p>
        </PermissionGate>
      </SectionCard>

      {/* Scheduling settings (Feature 2) */}
      <PermissionGate anyOf={["schedule.manage", "settings.manage"]} fallback={null}>
        <SectionCard title="Scheduling & publishing" subtitle="Controls what happens when a schedule is published">
          <div className="space-y-3">
            {SCHEDULE_TOGGLES.map((t) => (
              <div key={t.key} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><t.icon className="h-4 w-4" /></span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{t.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{t.desc}</p>
                  </div>
                </div>
                <button onClick={() => setSetting(t.key, !settings[t.key])} aria-label={t.label}
                  className={cn("relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors", settings[t.key] ? "bg-brand-600" : "bg-slate-300")}>
                  <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", settings[t.key] ? "left-[22px]" : "left-0.5")} />
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      </PermissionGate>

      {/* Data mode */}
      <SectionCard title="Data & sync" icon={<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Database className="h-4 w-4" /></span>}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Info label="Effective data mode" value={getEffectiveDataMode()} />
          <Info label="Sync status" value={syncStatus === "supabase-connected" ? "Live sync (Supabase)" : syncStatus === "supabase-unconfigured" ? "Setup needed" : "Local demo"} />
          <Info label="Realtime" value={syncStatus === "supabase-connected" ? "Enabled" : "Mock"} />
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Switch modes with <code>NEXT_PUBLIC_DATA_MODE</code> (web) / <code>EXPO_PUBLIC_DATA_MODE</code> (mobile). See SUPABASE_SETUP.md.
        </p>
      </SectionCard>
    </div>
  );
}

function SettingLink({ href, icon: Icon, title, desc, perm }: { href: string; icon: typeof Building2; title: string; desc: string; perm: string }) {
  return (
    <PermissionGate anyOf={[perm]}>
      <Link href={href} className="card card-hover flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="truncate text-xs text-slate-400">{desc}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </Link>
    </PermissionGate>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium capitalize text-slate-700">{value}</p>
    </div>
  );
}
