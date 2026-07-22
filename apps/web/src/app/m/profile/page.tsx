"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, BadgeCheck, Phone, Mail, ShieldAlert, Building2, Monitor } from "lucide-react";
import {
  certificationsForStaff, CERT_TYPE_LABELS, facilityName, formatDate,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useSession } from "@/lib/session";
import { certStatusMeta } from "@/lib/status";
import { StaffAvatar } from "@/components/ui/avatar";
import { StatusBadge, RoleBadge } from "@/components/ui/badge";
import { MSection } from "@/components/mobile/mobile-shell";

export default function MobileProfile() {
  const router = useRouter();
  const { staff: me, role } = useAccess();
  const logout = useSession((s) => s.logout);

  if (!me || !role) return null;
  const certs = certificationsForStaff(me.id);

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-navy-900 to-brand-800 px-5 pb-6 pt-6 text-center text-white">
        <StaffAvatar name={`${me.firstName} ${me.lastName}`} color={me.avatarColor} size="xl" className="mx-auto ring-4 ring-white/20" />
        <h1 className="mt-3 text-xl font-bold">{me.firstName} {me.lastName}</h1>
        <p className="text-sm text-white/80">{me.title}</p>
        <div className="mt-2 flex justify-center"><RoleBadge role={role} /></div>
      </div>

      <MSection title="Contact">
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
          <p className="flex items-center gap-2 text-slate-600"><Mail className="h-4 w-4 text-slate-400" /> {me.email}</p>
          <p className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4 text-slate-400" /> {me.phone}</p>
          <p className="flex items-center gap-2 text-slate-600"><Building2 className="h-4 w-4 text-slate-400" /> {facilityName(me.homeFacilityId)}</p>
        </div>
      </MSection>

      <MSection title="My certifications">
        {certs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-5 text-center text-sm text-slate-400">No certifications on file.</p>
        ) : (
          <ul className="space-y-2">
            {certs.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><BadgeCheck className="h-4 w-4" /></span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{CERT_TYPE_LABELS[c.type]}</p>
                  <p className="text-xs text-slate-400">{c.expiresDate ? `Expires ${formatDate(c.expiresDate)}` : "No expiry on file"}</p>
                </div>
                <StatusBadge {...certStatusMeta(c.status)} />
              </li>
            ))}
          </ul>
        )}
      </MSection>

      {me.onboardingComplete < 100 && (
        <MSection title="Onboarding">
          <Link href="/m/home" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Finish your onboarding</p>
              <p className="text-xs text-slate-500">{me.onboardingComplete}% complete · {me.documentsRequired - me.documentsSubmitted} forms left</p>
            </div>
          </Link>
        </MSection>
      )}

      <div className="px-4 pt-2">
        <Link href="/dashboard" className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600">
          <Monitor className="h-4 w-4" /> Open web dashboard
        </Link>
        <button onClick={() => { logout(); router.push("/login"); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 py-3 text-sm font-semibold text-rose-600">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
