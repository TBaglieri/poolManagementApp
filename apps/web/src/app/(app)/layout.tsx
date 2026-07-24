import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { getTenantAccess } from "@/lib/tenant/server";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  // Server-side isolation: a signed-in user cannot load a tenant they have no
  // membership in just by typing its URL (see AUDIT.md §6, requirement 4). Denied →
  // back to /login, which re-resolves them into their OWN tenant.
  if ((await getTenantAccess()) === "deny") redirect("/login");
  return <AppShell>{children}</AppShell>;
}
