# PoolOps Pro — QA Checklist

Two parts: (1) the **role × feature access matrix** (enforced by `packages/shared/src/rbac` and
verified by `npm test`), and (2) a **manual walk-through** to run per role before release.

Legend: ✅ allowed · — denied. "Self" = own records only.

## 1. Access matrix (key boundaries)

| Feature / action | Super | OrgAdmin | Ops Mgr | Guard Mgr | Sched Mgr | Payroll | HR | Head Guard | Lifeguard | Instructor | Maint | Auditor |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ |
| View full schedule | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | Self | Self | Self | — |
| Create/edit shifts | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — | — |
| Approve trades/time-off | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — | — |
| Request time-off / swap | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Clock self in/out | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | — |
| View/adjust all time entries | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — |
| Payroll & export | ✅ | ✅ | — | — | — | ✅ | — | — | — | — | — | — |
| Log chemicals | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | — | — |
| View chemicals | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | — | — | ✅ |
| Complete checklists | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | — | — | — |
| Submit shift reports | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — | — | — | — |
| Review shift reports | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | — |
| Report maintenance | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | ✅ | — | ✅ | — |
| Manage maintenance | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | — |
| Log patron counts | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — | — | — | — |
| Manage certifications | ✅ | ✅ | — | ✅ | — | — | ✅ | — | — | — | — | — |
| Lessons / attendance | ✅ | ✅ | View | View | — | — | — | View | — | ✅ | — | — |
| Members & households | ✅ | ✅ | View | View | — | — | View | — | — | View | — | — |
| Manage staff / invite | ✅ | ✅ | Staff* | — | — | — | ✅ | — | — | — | — | — |
| Post announcements | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | — | — | — |
| Manage roles & permissions | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| Platform / billing (all orgs) | ✅ | — | — | — | — | — | — | — | — | — | — | — |

\* ops_manager can edit staff profiles (`staff.manage` via HR-style ops), not org-wide role grants.

> This matrix is the source of truth in code and is asserted by the test suite
> (`packages/shared/src/rbac/permissions.test.ts`), including explicit **privilege-escalation**
> checks (no non-admin reaches `platform.manage`; override grants don't cascade).

## 2. Manual walk-through (per role) — mark pass/fail

For each role, use the demo **role switcher** (top-right) or log in as that role, then:

**Lifeguard (lowest tier)** — the key least-privilege check
- [ ] Lands on mobile home `/m/home`; sees own schedule, clock, chat, checklists.
- [ ] CAN clock in/out, request time-off, request a swap, pick up an open shift, complete a checklist.
- [ ] CANNOT open `/payroll`, `/settings/roles`, `/settings/permissions` (shows Access Restricted).
- [ ] CANNOT see approve buttons on `/schedule`; cannot manage staff.

**Head Lifeguard** — [ ] can submit shift reports, log patron counts, report maintenance; [ ] cannot approve trades or manage payroll.

**Scheduling / Ops / Guard Manager** — [ ] can open Auto Builder, generate + publish a draft; [ ] approve/deny a time-off and a swap (swap approval reassigns the shift); [ ] cannot open payroll (ops/guard/sched).

**Payroll** — [ ] `/payroll` opens; Export payroll downloads a CSV; Approve-all-ready works; [ ] cannot manage schedules.

**HR** — [ ] can invite staff, manage certifications & documents; [ ] cannot manage schedules or payroll.

**Auditor** — [ ] read-only everywhere reachable; [ ] no log/submit/manage buttons appear.

**Org Admin** — [ ] full org access incl. settings, roles, users; [ ] cannot access platform-wide billing (`platform.manage`).

## 3. Cross-cutting checks
- [ ] Auth: sign up → routed to `/setup` wizard; sign in → dashboard by role; sign out clears session.
- [ ] Each create form validates (required fields, date order) and shows errors, not silent failures.
- [ ] Empty states render (no shifts / no readings / no pending approvals).
- [ ] Loading & success states on submit (request modals, clock).
- [ ] Supabase health chip reflects Live sync / Schema needed / Local demo.
- [ ] Poor connection: writes fall back to demo gracefully; app never white-screens.
- [ ] No secrets in the client bundle (service-role key server-only).

## 4. Automated
- [ ] `npm test` → all green (RBAC, scheduling engine, CSV).
- [ ] `npm run typecheck` → clean.
- [ ] `npm run build:web` → all routes compile.
