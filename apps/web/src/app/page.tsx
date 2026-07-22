import Link from "next/link";
import {
  ArrowRight, CalendarDays, FlaskConical, Clock, ShieldCheck, MessageSquare, Wrench,
  GraduationCap, BadgeCheck, Smartphone, Monitor, Check, Sparkles, Waves,
} from "lucide-react";
import { ROLE_LIST } from "@poolops/shared";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/marketing-chrome";
import { RoleBadge } from "@/components/ui/badge";

const FEATURES = [
  { icon: CalendarDays, title: "Smart scheduling", desc: "Build coverage in minutes, spot gaps, and let staff pick up open shifts or trade with one tap." },
  { icon: Clock, title: "Time clock & payroll", desc: "GPS-aware clock in/out, missed-punch alerts, and clean timesheet exports for your payroll team." },
  { icon: FlaskConical, title: "Chemical records", desc: "Log readings, auto-flag out-of-range values, and keep an audit-ready history for health inspectors." },
  { icon: BadgeCheck, title: "Certification tracking", desc: "Never miss a lapse — track lifeguard, CPR/AED, WSI, and CPO certs with expiry reminders." },
  { icon: ShieldCheck, title: "Inspections & checklists", desc: "Daily opening/closing checklists and equipment inspections with pass/fail and photos." },
  { icon: MessageSquare, title: "Team communication", desc: "Announcements and channels by role and facility so the right people get the message fast." },
  { icon: Wrench, title: "Maintenance tracking", desc: "Report issues from the deck, assign and prioritize, and resolve them on a clean board." },
  { icon: GraduationCap, title: "Lessons & members", desc: "Manage swim classes, rosters, attendance, progress notes, and household memberships." },
];

const WEB_POINTS = [
  "Role-aware dashboard for owners, directors & managers",
  "Drag-free weekly schedule grid with coverage warnings",
  "Payroll review, approvals, and CSV exports",
  "Reports & analytics across every facility",
];
const MOBILE_POINTS = [
  "Clock in/out and view today's shift in one tap",
  "Complete checklists and log chemicals on the deck",
  "Get announcements and request time off or trades",
  "Managers approve requests and post alerts on the go",
];

export default function LandingPage() {
  return (
    <div className="min-h-full bg-white">
      <MarketingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/80 via-white to-white" />
        <div className="absolute -top-24 right-0 -z-10 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -left-24 top-32 -z-10 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" /> One platform · web dashboard + mobile app
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Run your pool like a pro,<br />
              <span className="bg-gradient-to-r from-brand-600 to-cyan-500 bg-clip-text text-transparent">from the office to the deck.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              PoolOps Pro brings scheduling, time clock, chemical logs, certifications, onboarding,
              and team communication into one clean system — for community pools, swim clubs, camps,
              and municipal aquatic centers.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/login" className="btn-primary btn px-6 py-3 text-base">
                Launch live demo <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pricing" className="btn-secondary btn px-6 py-3 text-base">View pricing &amp; plans</Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">No credit card required · Explore all 12 roles in demo mode</p>
          </div>

          {/* Stat band */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { v: "24+", l: "Operations modules" },
              { v: "12", l: "Staff access levels" },
              { v: "4", l: "Facilities in demo" },
              { v: "Web + iOS/Android", l: "Shared backend" },
            ].map((s) => (
              <div key={s.l} className="card p-5 text-center">
                <p className="text-2xl font-bold text-slate-900">{s.v}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Everything aquatics, in one place</h2>
          <p className="mt-3 text-slate-600">Purpose-built for pool operations — not a generic admin tool bent into shape.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-hover p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platforms */}
      <section id="platforms" className="bg-navy-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-200">
              <Waves className="h-3.5 w-3.5" /> One product, two surfaces
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Built for the desk and the deck</h2>
            <p className="mt-3 text-white/70">
              The web dashboard powers your office. The mobile app keeps lifeguards, instructors, and
              managers moving. Both share the same data in real time through Supabase.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20 text-brand-200"><Monitor className="h-5 w-5" /></span>
                <h3 className="text-lg font-semibold">Web dashboard</h3>
              </div>
              <ul className="mt-5 space-y-3">
                {WEB_POINTS.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-white/80">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" /> {p}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="btn-primary mt-7 inline-flex">Open dashboard <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-200"><Smartphone className="h-5 w-5" /></span>
                <h3 className="text-lg font-semibold">Mobile app</h3>
              </div>
              <ul className="mt-5 space-y-3">
                {MOBILE_POINTS.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-white/80">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /> {p}
                  </li>
                ))}
              </ul>
              <Link href="/m/home" className="btn-secondary mt-7 inline-flex border-white/20 bg-white/10 text-white hover:bg-white/20">
                Preview mobile app <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Access levels for every role</h2>
          <p className="mt-3 text-slate-600">
            From super admins to seasonal lifeguards, everyone sees exactly what they need — and nothing they shouldn't.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-2.5">
          {ROLE_LIST.map((r) => <RoleBadge key={r.slug} role={r.slug} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-cyan-600 px-8 py-14 text-center shadow-lift sm:px-16">
          <h2 className="text-3xl font-bold tracking-tight text-white">Ready to dive in?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Explore the full platform in demo mode — pick any role and see PoolOps Pro from their seat.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login" className="btn bg-white px-6 py-3 text-base font-semibold text-brand-700 hover:bg-brand-50">
              Start the demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className="btn border border-white/40 px-6 py-3 text-base font-semibold text-white hover:bg-white/10">
              Compare plans
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
