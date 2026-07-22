import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { getServerTenantConfig, getTenantSlug } from "@/lib/tenant/server";
import { TenantProvider } from "@/lib/tenant/provider";
import { ThemeInjector } from "@/components/theme/theme-injector";
import { themeCss, brandHex } from "@/lib/tenant/theme-css";
import { tenantMetadata } from "@/lib/tenant/metadata";

/** Absolute origin of the current request (proto + host), from proxy-aware headers. */
function requestOrigin(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function generateViewport(): Promise<Viewport> {
  const config = await getServerTenantConfig();
  return {
    themeColor: brandHex(config, 700),
    width: "device-width",
    initialScale: 1,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const config = await getServerTenantConfig();
  return tenantMetadata(config, { origin: requestOrigin(), slug: getTenantSlug() });
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const slug = getTenantSlug();
  const config = await getServerTenantConfig();

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* SSR theme tokens — no flash of the wrong brand before hydration. */}
        <style id="tenant-theme-ssr" dangerouslySetInnerHTML={{ __html: themeCss(config) }} />
        {/* Apply the dark class pre-paint from saved preference / tenant default. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d="${config.theme.defaultScheme}";var s=JSON.parse(localStorage.getItem("poolops-scheme")||"null");var p=(s&&s.state&&s.state.scheme)||d;var m=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;var dark=p==="dark"||(p==="system"&&m);if(dark)document.documentElement.classList.add("dark");document.documentElement.style.colorScheme=dark?"dark":"light";}catch(e){}})();`,
          }}
        />
      </head>
      <body className="h-full font-sans antialiased" style={{ fontFamily: "var(--font-brand), Inter, system-ui, sans-serif" }}>
        <TenantProvider slug={slug} initialConfig={config}>
          <ThemeInjector />
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
