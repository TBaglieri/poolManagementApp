"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTenantConfig } from "@/lib/tenant/provider";
import { useThemeScheme } from "@/lib/tenant/theme-store";
import { cn } from "@/lib/cn";

type Scheme = "light" | "dark" | "system";
const ORDER: Scheme[] = ["light", "dark", "system"];
const ICON = { light: Sun, dark: Moon, system: Monitor } as const;
const LABEL = { light: "Light", dark: "Dark", system: "System" } as const;

/** Per-user light/dark/system preference. Hidden if the tenant locks the scheme. */
export function SchemeToggle() {
  const config = useTenantConfig();
  const { scheme, setScheme, hydrated } = useThemeScheme();
  if (!config.theme.allowUserScheme) return null;

  const current: Scheme = (scheme ?? config.theme.defaultScheme) as Scheme;
  const Icon = ICON[current];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

  return (
    <button
      onClick={() => setScheme(next)}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors",
        "hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
      )}
      title={`Theme: ${LABEL[current]} (click for ${LABEL[next]})`}
      aria-label={`Switch theme, currently ${LABEL[current]}`}
      suppressHydrationWarning
    >
      {hydrated ? <Icon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
    </button>
  );
}
