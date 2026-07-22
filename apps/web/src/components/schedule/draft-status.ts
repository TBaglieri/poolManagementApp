import type { DraftStatus } from "@poolops/scheduling";
import type { Intent } from "@/lib/status";

export const DRAFT_STATUS_META: Record<DraftStatus, { label: string; intent: Intent }> = {
  draft: { label: "Draft", intent: "neutral" },
  needs_review: { label: "Needs Review", intent: "warning" },
  ready: { label: "Ready to Publish", intent: "success" },
  published: { label: "Published", intent: "brand" },
  failed: { label: "Needs Manual Fix", intent: "danger" },
};
