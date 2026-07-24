# DESIGN.md — PoolOps Pro design system

The single job driving every choice: **let a lifeguard log what happened in under
30 seconds, and let a manager see whether the pool is covered, compliant, and safe
today at a glance.** Hardest constraint: a teenager reading a phone on a wet pool
deck in bright sun. Legibility and touch usability win every tie.

This document is the contract for future UI work so the app stays consistent. It
reflects the direction proven on the **admin dashboard** first (see "Status" at the
end); the rest of the app adopts it in the full pass.

---

## 1. Tokens — everything resolves from the tenant

No component hardcodes a brand hex. Every color, radius, and font comes from a CSS
variable injected per tenant (`resolveThemeVars()` → `<style>` at `:root`, SSR +
client). Another pool gets this same layout in **their** palette with no code change.

### Color scales (`rgb(var(--x) / <alpha>)`, consumed via Tailwind `brand`/`navy`/`accent`)

| Token | Role | Villas value |
| --- | --- | --- |
| `--brand-50…950` | Primary — actions, links, focus, key marks | Hudson teal `#0F7285` (brand-700) |
| `--navy-50…950` | Chrome — sidebar, deep surfaces | Slate `#28323E` |
| `--accent-50…950` | **Highlight only, never status.** Spend once per screen. | Sandstone `#C89B6C` |

`--accent-*` is **new**: the tenant `accent` was parsed but never emitted, so the
signature had no token to use. It now derives a full 50–950 scale like brand/navy.

### Neutrals & status

- **Neutrals** use the Tailwind `slate` family (the tenant's `neutral` setting).
- **Status is semantic and fixed** (allowed by the brief): `emerald` = ok /
  `amber` = watch / `rose` = danger / `sky` = info. Pool-safety meaning must be
  unmistakable, so green/amber/red never change per tenant. Centralized in
  `lib/status.ts` (`INTENT_CLASSES`, `INTENT_DOT`) — use those, don't re-pick colors.

### Radius & font

- `--radius-lg / -xl / -2xl` from the tenant `radius` setting (sharp/soft/round).
- `--font-brand` is the tenant UI face (Villas: Inter). We deliberately do **not**
  add a display face: on a sunlit phone, legibility beats a characterful headline
  font. Personality comes from the **type scale** and **tabular figures** instead.

---

## 2. Type scale

A real hierarchy with intentional jumps so labels, titles, metrics, and helper text
never read at the same weight. Utility classes in `globals.css`:

| Class | Size / weight | Use |
| --- | --- | --- |
| `.metric` | 30px bold, tight, **tabular-nums** | The numbers a manager scans |
| `.metric-sm` | 24px bold, tabular-nums | Secondary metrics |
| page `h1` | 20–24px bold | Page title (`PageHeader`) |
| `.card-title` | 15px semibold | Card / section titles |
| body | 14px | Content |
| `.eyebrow` | 11px semibold, **uppercase**, `+0.08em` | Section labels above a block |
| `.caption` | 12px slate-500 | Helper / meta text |

**Tabular figures** (`.tnum`, and built into `.metric*`) everywhere numbers matter,
so values align in columns and don't jitter as they update — an operations-desk feel.

---

## 3. Spacing

Tailwind's 4px scale. Rhythm in use:

- Page sections: `space-y-6` (24px).
- Card padding: `p-5` (20px); compact rows `py-3`.
- Related items: `gap-2`/`gap-3`; grid gutters `gap-4`/`gap-6`.
- **Touch targets ≥ 44px** for any control a lifeguard taps on a phone.

---

## 4. Action / button hierarchy

One system, applied everywhere (`.btn-*` in `globals.css`, wrapped by
`components/ui/button.tsx`). Exactly one primary action per view.

| Level | Class | When |
| --- | --- | --- |
| **Primary** | `.btn-primary` (filled brand) | The main action — one per screen |
| **Secondary** | `.btn-secondary` (outline) | Supporting actions, row-level actions |
| **Tertiary** | `.btn-ghost` | Low-emphasis / icon-only |
| **Destructive** | `.btn-danger` (filled rose) | Delete / close / deny — never the default |

Every button uses **active voice** and keeps its verb through the flow (a button
that says "Log reading" produces a toast that says "Reading logged"). Row actions are
`.btn-secondary` at small size; the page's one primary lives in the `PageHeader`.

---

## 5. Status system (one way to show state)

- **Badges**: `StatusBadge` / `Badge` (`intent` = ok/warn/danger/info/neutral/brand).
- **Alerts**: `AlertCard` (same intents).
- **Dots / rails / meters**: `INTENT_DOT` + the Readiness rail.
- Learnability comes from repetition: the same color means the same thing on the
  dashboard, in chemicals, and on a badge.

---

## 6. Signature — the Readiness band

`components/dashboard/readiness-band.tsx`. The dashboard's memorable element and the
manager's three-second glance: **Covered · Compliant · Safe**, each a real question,
not a KPI. Reduction is the idea — a dozen equal-weight cards became three answers,
set with the strict type hierarchy (eyebrow → tabular metric → caption → one verb
link) and a thin semantic status rail. The tenant **accent** appears exactly once
here, as the section's eyebrow rule. No skeuomorphic "water" decoration — the
distinctiveness is the clarity, kept professional.

Dashboard hierarchy pattern (reusable):

1. **Readiness band** — the glance.
2. **Needs you** — progressive disclosure: rows render only when there's something to
   do; an all-clear state replaces empty cards.
3. **Detail** — quieter secondary cards under an `.eyebrow`, clearly de-emphasized.

---

## 7. Writing

- Active voice; name things by what people control ("Log reading", not "Submit").
- Empty states are invitations to act: say what to do and give the control
  ("No announcements yet — post one to the all-staff channel").
- Errors say what happened and how to fix it, in the interface's voice.
- Sentence case, plain verbs, no filler.

---

## 8. Quality floor (present, not announced)

- Responsive to mobile (the Readiness band stacks; targets stay ≥44px).
- Visible keyboard focus (`focus-visible` rings on all interactive classes).
- `prefers-reduced-motion` honored globally (`globals.css`) — animation is never
  load-bearing.
- **WCAG AA** for text-on-surface. Brand scales run through `ensureAccessible()`;
  status colors use ≥AA weights. Contrast must hold for a **different** tenant
  palette, not just Villas.

---

## Status of adoption

- ✅ **Implemented now:** token pipeline (accent emitted + `accent` Tailwind scale),
  type-scale utilities, the Readiness band, and the **admin dashboard** rebuilt to
  the three-tier hierarchy.
- ⏳ **Next pass (pending approval):** lifeguard home (Schedule), chemical logging,
  checklists, admin/dense screens, logins, and a sweep of empty/loading/error states
  — all following this document.
