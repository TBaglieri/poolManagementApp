import Link from "next/link";
import { Logo } from "@/components/brand";
import { TenantWordmark } from "@/components/theme/tenant-brand";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Config-driven: PoolOps Pro on platform pages, the tenant's mark on /<tenant>. */}
        <Link href="/"><TenantWordmark /></Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <Link href="/#features" className="hover:text-slate-900">Features</Link>
          <Link href="/#platforms" className="hover:text-slate-900">Web &amp; Mobile</Link>
          <Link href="/pricing" className="hover:text-slate-900">Pricing</Link>
          <Link href="/quote" className="hover:text-slate-900">Contact sales</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost hidden sm:inline-flex">Sign in</Link>
          <Link href="/pricing" className="btn-primary">Get started</Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  const cols: { title: string; links: { label: string; href: string }[] }[] = [
    { title: "Product", links: [
      { label: "Features", href: "/#features" }, { label: "Web &amp; mobile", href: "/#platforms" },
      { label: "Pricing", href: "/pricing" }, { label: "Sign in", href: "/login" },
    ]},
    { title: "Solutions", links: [
      { label: "Community pools", href: "/#features" }, { label: "Swim clubs", href: "/#features" },
      { label: "Camps &amp; schools", href: "/#features" }, { label: "Aquatic centers", href: "/#features" },
    ]},
    { title: "Company", links: [
      { label: "Pricing", href: "/pricing" }, { label: "Request a quote", href: "/quote" },
      { label: "Contact sales", href: "/quote" }, { label: "Sign in", href: "/login" },
    ]},
  ];
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-slate-500">
              Modern operations software for community pools, swim clubs, camps, and aquatic centers.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-sm font-semibold text-slate-900">{c.title}</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-brand-700" dangerouslySetInnerHTML={{ __html: l.label }} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} PoolOps Pro. A demonstration product. Not affiliated with any other aquatics software.</p>
          <p>Built as an original, legally distinct platform.</p>
        </div>
      </div>
    </footer>
  );
}
