"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { TenantSplash } from "@/components/theme/tenant-brand";

/**
 * Gated demo entry point. Middleware only lets a request reach here if it carried
 * a valid `?token=<secret>` (it set the demo_access cookie). We then establish a
 * demo session and drop the visitor on the dashboard, where the role switcher is
 * available. There is no link to this page anywhere in the product.
 */
export default function EnterDemoPage() {
  const router = useRouter();
  const enterDemo = useSession((s) => s.enterDemo);

  useEffect(() => {
    enterDemo("org_admin");
    router.replace("/dashboard");
  }, [enterDemo, router]);

  return <TenantSplash label="Preparing your demo…" />;
}
