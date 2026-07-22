"use client";

import Link from "next/link";
import { Wand2, ListChecks } from "lucide-react";
import { useAccess } from "@/lib/access";
import { useTenantSeed } from "@/lib/tenant-data";
import { PageHeader } from "@/components/ui/page-header";
import { AccessRestricted } from "@/components/ui/permission-gate";
import { EmptyState } from "@/components/ui/empty-state";
import { AutoScheduleBuilder } from "@/components/schedule/auto-schedule-builder";

export default function AutoBuilderPage() {
  const { can } = useAccess();
  // The auto-builder runs on sample staffing scenarios (demo only). A real tenant
  // builds schedules from its own roster + templates once staff exist.
  const { demo } = useTenantSeed();
  if (!can("schedule.manage")) {
    return <AccessRestricted message="Auto schedule generation is limited to scheduling managers and admins." />;
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Auto Schedule Builder"
        subtitle="Generate a balanced, conflict-free draft for any week in seconds — then review and publish."
        actions={
          <>
            <Link href="/schedule/drafts" className="btn-secondary"><ListChecks className="h-4 w-4" /> Drafts</Link>
            <Link href="/schedule" className="btn-secondary"><Wand2 className="h-4 w-4" /> Schedule</Link>
          </>
        }
      />
      {demo ? (
        <AutoScheduleBuilder />
      ) : (
        <EmptyState icon="Wand2" title="Add your team to build schedules"
          description="The auto-builder assigns shifts from your staff roster and templates. Invite staff from Users & Access, then come back to generate a draft."
          action={<Link href="/settings/users" className="btn-primary">Invite staff</Link>} />
      )}
    </div>
  );
}
