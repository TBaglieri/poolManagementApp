"use client";

/**
 * Branding & Modules admin — create/point a tenant's identity, theme, feature
 * flags, and role labels without touching code or redeploying. Edits preview live
 * across the whole app (they set the tenant override); Save persists to this
 * browser (mock mode) or the org config (supabase mode, when the column exists).
 */
import { useMemo, useRef, useState } from "react";
import {
  MODULES, THEME_PRESETS, ROLE_LIST, ORG_TYPE_LABELS, resolveThemeVars,
  isModuleEnabled, type DeepPartial, type TenantConfig,
} from "@poolops/shared";
import { useAccess } from "@/lib/access";
import { useTenant } from "@/lib/tenant/provider";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Tabs, SegmentedControl } from "@/components/ui/tabs";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { TenantMark } from "@/components/theme/tenant-brand";
import { cn } from "@/lib/cn";
import { Check, X, AlertTriangle, Sparkles } from "lucide-react";

type Override = DeepPartial<TenantConfig>;

function setIn(obj: any, path: string[], value: unknown): any {
  const [head, ...rest] = path;
  if (head === undefined) return value;
  const base = obj && typeof obj === "object" ? obj : {};
  return { ...base, [head]: rest.length ? setIn(base[head], rest, value) : value };
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
        checked ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-700",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-1")} />
    </button>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1" aria-label={label} />
        <input className="input font-mono" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

export default function BrandingAdminPage() {
  const { can } = useAccess();
  const { config, save, setPreview, discardPreview, reset, slug } = useTenant();
  const [tab, setTab] = useState("theme");

  // Seed the draft override synchronously from persisted edits (avoids a flash).
  const [draft, setDraftState] = useState<Override>(() => {
    if (typeof window === "undefined") return {};
    try { const raw = localStorage.getItem(`poolops-tenant-override:${slug}`); return raw ? JSON.parse(raw) : {}; }
    catch { return {}; }
  });
  const savedRef = useRef(JSON.stringify(draft));
  const dirty = JSON.stringify(draft) !== savedRef.current;

  function setDraft(next: Override) {
    setDraftState(next);
    setPreview(next); // live, app-wide preview
  }
  const upd = (path: string[], value: unknown) => setDraft(setIn(draft, path, value));

  const theme = useMemo(() => resolveThemeVars(config), [config]);
  const brandStops = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

  if (!can("settings.manage")) return <AccessRestricted />;

  const onSave = () => { save(draft); savedRef.current = JSON.stringify(draft); };
  const onDiscard = () => {
    const restored = (() => { try { const raw = localStorage.getItem(`poolops-tenant-override:${slug}`); return raw ? JSON.parse(raw) : {}; } catch { return {}; } })();
    setDraftState(restored); savedRef.current = JSON.stringify(restored); discardPreview();
  };
  const onReset = () => { setDraftState({}); savedRef.current = JSON.stringify({}); reset(); };

  const activePreset = THEME_PRESETS.find((p) => p.theme.brand?.toLowerCase() === config.theme.brand.toLowerCase());

  return (
    <div className="space-y-5">
      <PageHeader
        title="Branding & Modules"
        subtitle={`Editing "${config.displayName}" (${slug}). Changes preview live across the app.`}
        actions={
          <>
            {dirty && <span className="hidden items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 sm:inline-flex">Unsaved changes</span>}
            <Button variant="ghost" onClick={onDiscard} disabled={!dirty}>Discard</Button>
            <Button onClick={onSave} icon="Save" disabled={!dirty}>Save changes</Button>
          </>
        }
      />

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "theme", label: "Theme" },
          { key: "features", label: "Modules" },
          { key: "identity", label: "Identity & Copy" },
          { key: "roles", label: "Role Labels" },
          { key: "advanced", label: "Advanced" },
        ]}
      />

      {/* ------------------------------- THEME -------------------------------- */}
      {tab === "theme" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <SectionCard title="Preset themes" subtitle="One click applies a full accessible look." icon={<Sparkles className="h-4 w-4 text-brand-600" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                {THEME_PRESETS.map((p) => {
                  const active = activePreset?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => upd(["theme"], { ...(draft.theme ?? {}), ...p.theme })}
                      className={cn("flex flex-col gap-2 rounded-xl border p-3 text-left transition-all hover:shadow-soft", active ? "border-brand-500 ring-2 ring-brand-500/30" : "border-slate-200 dark:border-slate-700")}
                    >
                      <div className="flex items-center gap-1.5">
                        {[p.theme.brand, p.theme.secondary, p.theme.accent].map((c, i) => (
                          <span key={i} className="h-6 w-6 rounded-full ring-1 ring-black/5" style={{ backgroundColor: c }} />
                        ))}
                        {active && <Check className="ml-auto h-4 w-4 text-brand-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{p.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{p.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Brand colors" subtitle="A full accessible palette is derived from these.">
              <div className="grid gap-4 sm:grid-cols-3">
                <ColorField label="Primary" value={config.theme.brand} onChange={(v) => upd(["theme", "brand"], v)} />
                <ColorField label="Secondary (chrome)" value={config.theme.secondary} onChange={(v) => upd(["theme", "secondary"], v)} />
                <ColorField label="Accent" value={config.theme.accent} onChange={(v) => upd(["theme", "accent"], v)} />
              </div>
              <div className="mt-4">
                <p className="label">Derived brand scale</p>
                <div className="flex overflow-hidden rounded-lg ring-1 ring-black/5">
                  {brandStops.map((s) => (
                    <div key={s} className="h-9 flex-1" style={{ backgroundColor: `rgb(${theme.vars[`--brand-${s}`]})` }} title={`brand-${s}`} />
                  ))}
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Corner radius">
                  <SegmentedControl value={config.theme.radius} onChange={(v) => upd(["theme", "radius"], v)} options={[{ value: "sharp", label: "Sharp" }, { value: "soft", label: "Soft" }, { value: "round", label: "Round" }]} />
                </Field>
                <Field label="Density">
                  <SegmentedControl value={config.theme.density} onChange={(v) => upd(["theme", "density"], v)} options={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]} />
                </Field>
                <Field label="Default scheme">
                  <SegmentedControl value={config.theme.defaultScheme} onChange={(v) => upd(["theme", "defaultScheme"], v)} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "System" }]} />
                </Field>
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={config.theme.allowUserScheme} onChange={(e) => upd(["theme", "allowUserScheme"], e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                Let users pick their own light/dark preference
              </label>
            </SectionCard>
          </div>

          {/* Live preview + accessibility */}
          <div className="space-y-5">
            <SectionCard title="Live preview">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 rounded-xl bg-navy-950 p-3 text-white">
                  <TenantMark size="md" />
                  <span className="font-bold">{config.displayName}</span>
                </div>
                <div className="card p-4">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Sample card</p>
                  <p className="mt-1 text-xs text-slate-500">Buttons and chips use the tenant tokens.</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button className="btn-primary">Primary</button>
                    <button className="btn-secondary">Secondary</button>
                    <span className="chip bg-brand-100 text-brand-700">Chip</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Accessibility (WCAG)">
              <ul className="space-y-2">
                {theme.checks.map((c) => (
                  <li key={c.pair} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{c.pair}</span>
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", c.passesAA ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                      {c.passesAA ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {c.ratio.toFixed(1)}:1
                    </span>
                  </li>
                ))}
              </ul>
              {theme.warnings.map((w) => (
                <p key={w} className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w}
                </p>
              ))}
            </SectionCard>
          </div>
        </div>
      )}

      {/* ------------------------------ FEATURES ------------------------------ */}
      {tab === "features" && (
        <SectionCard title="Modules" subtitle="Turn capabilities on or off for this tenant. Disabled modules are hidden and their routes blocked server-side.">
          <div className="space-y-6">
            {Object.entries(groupModules()).map(([group, mods]) => (
              <div key={group}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group}</p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {mods.map((m) => {
                    const on = isModuleEnabled(config, m.id);
                    return (
                      <div key={m.id} className="py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                              {m.label}
                              {m.core && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Always on</span>}
                              {m.comingSoon && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Soon</span>}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">{m.description}</p>
                          </div>
                          <Switch checked={on} disabled={m.core || m.comingSoon} onChange={(v) => upd(["features", m.id], v)} />
                        </div>
                        {on && m.subFeatures && (
                          <div className="mt-2 space-y-2 border-l-2 border-slate-100 pl-4 dark:border-slate-800">
                            {m.subFeatures.map((sf) => {
                              const subOn = config.subFeatures[`${m.id}.${sf.id}`] !== false;
                              return (
                                <div key={sf.id} className="flex items-center justify-between gap-3">
                                  <span className="text-xs text-slate-500">{sf.label}</span>
                                  <Switch checked={subOn} onChange={(v) => upd(["subFeatures", `${m.id}.${sf.id}`], v)} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ------------------------------ IDENTITY ------------------------------ */}
      {tab === "identity" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <SectionCard title="Identity">
            <div className="space-y-4">
              <Field label="Display name" hint="Shown in the sidebar and titles."><Input value={config.displayName} onChange={(e) => upd(["displayName"], e.target.value)} /></Field>
              <Field label="In-app product name"><Input value={config.productName} onChange={(e) => upd(["productName"], e.target.value)} /></Field>
              <Field label="Legal name"><Input value={config.legalName} onChange={(e) => upd(["legalName"], e.target.value)} /></Field>
              <Field label="Organization type">
                <Select value={config.organizationType} onChange={(e) => upd(["organizationType"], e.target.value)}>
                  {Object.entries(ORG_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contact email"><Input value={config.contact.email} onChange={(e) => upd(["contact", "email"], e.target.value)} /></Field>
                <Field label="Contact phone"><Input value={config.contact.phone} onChange={(e) => upd(["contact", "phone"], e.target.value)} /></Field>
              </div>
              <Field label="Address"><Input value={config.address} onChange={(e) => upd(["address"], e.target.value)} /></Field>
            </div>
          </SectionCard>

          <div className="space-y-5">
            <SectionCard title="Logo & mark">
              <div className="flex items-center gap-4">
                <TenantMark size="lg" />
                <div className="flex-1 space-y-3">
                  <Field label="Monogram" hint="Used when no logo image is set (1–3 letters)."><Input maxLength={3} value={config.branding.monogram} onChange={(e) => upd(["branding", "monogram"], e.target.value)} /></Field>
                  <Field label="Logo image">
                    <input
                      type="file" accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const r = new FileReader();
                        r.onload = () => upd(["branding", "logoLight"], String(r.result));
                        r.readAsDataURL(file);
                      }}
                      className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </Field>
                  {config.branding.logoLight && <Button variant="ghost" size="sm" onClick={() => upd(["branding", "logoLight"], undefined)}>Remove logo</Button>}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Copy">
              <div className="space-y-4">
                <Field label="Tagline"><Input value={config.copy.tagline} onChange={(e) => upd(["copy", "tagline"], e.target.value)} /></Field>
                <Field label="Welcome text"><Textarea value={config.copy.welcome} onChange={(e) => upd(["copy", "welcome"], e.target.value)} /></Field>
                <Field label="Rules text"><Textarea value={config.copy.rules} onChange={(e) => upd(["copy", "rules"], e.target.value)} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email footer"><Input value={config.copy.emailFooter} onChange={(e) => upd(["copy", "emailFooter"], e.target.value)} /></Field>
                  <Field label="Notification sender"><Input value={config.copy.notificationSender} onChange={(e) => upd(["copy", "notificationSender"], e.target.value)} /></Field>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Operations">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Pool hours"><Input value={config.operations.poolHours} onChange={(e) => upd(["operations", "poolHours"], e.target.value)} /></Field>
                <Field label="Max guests / member"><Input type="number" value={config.operations.maxGuestsPerMember} onChange={(e) => upd(["operations", "maxGuestsPerMember"], Number(e.target.value))} /></Field>
                <Field label="Season start (MM-DD)"><Input value={config.operations.seasonStart} onChange={(e) => upd(["operations", "seasonStart"], e.target.value)} /></Field>
                <Field label="Season end (MM-DD)"><Input value={config.operations.seasonEnd} onChange={(e) => upd(["operations", "seasonEnd"], e.target.value)} /></Field>
                <Field label="Reservation slot (min)"><Input type="number" value={config.operations.reservationSlotMinutes} onChange={(e) => upd(["operations", "reservationSlotMinutes"], Number(e.target.value))} /></Field>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ------------------------------- ROLES -------------------------------- */}
      {tab === "roles" && (
        <SectionCard title="Role labels" subtitle="Rename roles for this tenant (e.g. “Board”, “HOA Committee”). Permissions stay the same.">
          <div className="grid gap-4 sm:grid-cols-2">
            {ROLE_LIST.map((r) => (
              <Field key={r.slug} label={`${r.name}`} hint={`Default: ${r.shortName}`}>
                <Input
                  placeholder={r.shortName}
                  value={config.roleLabels[r.slug] ?? ""}
                  onChange={(e) => upd(["roleLabels", r.slug], e.target.value || undefined)}
                />
              </Field>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ------------------------------ ADVANCED ------------------------------ */}
      {tab === "advanced" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <SectionCard title="Export / import" subtitle="Move this configuration between environments or seed the database.">
            <div className="space-y-3">
              <Button variant="secondary" icon="Download" onClick={() => download(`${slug}.tenant.json`, JSON.stringify(config, null, 2))}>
                Download full config JSON
              </Button>
              <Button variant="secondary" icon="Download" onClick={() => download(`${slug}.override.json`, JSON.stringify(draft, null, 2))}>
                Download override only
              </Button>
              <Field label="Import an override (paste JSON, then Save)">
                <Textarea
                  placeholder='{ "theme": { "brand": "#0F7285" } }'
                  onChange={(e) => { try { setDraft(JSON.parse(e.target.value)); } catch { /* wait for valid json */ } }}
                />
              </Field>
              <Button variant="ghost" icon="RotateCcw" onClick={onReset}>Reset this tenant to config defaults</Button>
            </div>
          </SectionCard>

          <NewTenantCard />
        </div>
      )}
    </div>
  );
}

function groupModules(): Record<string, typeof MODULES> {
  const out: Record<string, typeof MODULES> = {};
  for (const m of MODULES) (out[m.group] ??= []).push(m);
  return out;
}

/** Generate a registry-ready config for pool #2 in a few fields. */
function NewTenantCard() {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("#0F7285");
  const [type, setType] = useState("community_pool");
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "new-pool";
  const monogram = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "NP";
  const config = {
    slug, displayName: name || "New Pool", productName: name || "New Pool",
    organizationType: type, branding: { monogram }, theme: { brand },
  };

  return (
    <SectionCard title="Onboard a new pool" subtitle="Name + a color is enough. Downloads a config record to add to the registry (see ONBOARDING.md).">
      <div className="space-y-4">
        <Field label="Pool / community name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Riverside Swim Club" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField label="Primary color" value={brand} onChange={setBrand} />
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(ORG_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900">
          <p className="text-slate-500">Slug: <span className="font-mono text-slate-700 dark:text-slate-300">{slug}</span></p>
          <pre className="mt-2 overflow-x-auto text-[11px] text-slate-600 dark:text-slate-400">{JSON.stringify(config, null, 2)}</pre>
        </div>
        <Button icon="Download" onClick={() => download(`${slug}.tenant.json`, JSON.stringify(config, null, 2))}>Download config record</Button>
      </div>
    </SectionCard>
  );
}
