"use client";

/**
 * Injects the active tenant's theme as CSS custom properties at :root and toggles
 * light/dark. The server layout already renders an initial (SSR) copy so there's
 * no flash; this client copy re-renders live when admin edits or the user's
 * scheme preference change (drives the admin theme-preview and the dark toggle).
 */
import { useEffect } from "react";
import { useTenant } from "@/lib/tenant/provider";
import { useThemeScheme } from "@/lib/tenant/theme-store";
import { themeCss } from "@/lib/tenant/theme-css";

export function ThemeInjector() {
  const { config } = useTenant();
  const { scheme } = useThemeScheme();
  const css = themeCss(config);

  useEffect(() => {
    const pref = scheme ?? config.theme.defaultScheme;
    const prefersDark = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const dark = pref === "dark" || (pref === "system" && prefersDark);
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
  }, [scheme, config.theme.defaultScheme]);

  return <style id="tenant-theme" dangerouslySetInnerHTML={{ __html: css }} />;
}
