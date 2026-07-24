import {
  CERT_STATUS_LABELS, FACILITY_STATUS_LABELS, ISSUE_PRIORITY_LABELS, ISSUE_STATUS_LABELS,
  PAYROLL_STATUS_LABELS, REQUEST_STATUS_LABELS, STAFF_FLAG_LABELS,
  type CertStatus, type FacilityStatus, type IssuePriority, type IssueStatus,
  type PayrollStatus, type RequestStatus, type StaffStatusFlag,
} from "@poolops/shared";

export type Intent = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

export const INTENT_CLASSES: Record<Intent, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  danger: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
  info: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/15",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/20",
};

// Solid status indicators use -600 weights: they read clearly on a bright phone in
// sunlight, where the lighter -500s wash out. Badge/alert text stays -700 (AA on tint).
export const INTENT_DOT: Record<Intent, string> = {
  success: "bg-emerald-600",
  warning: "bg-amber-600",
  danger: "bg-rose-600",
  info: "bg-sky-600",
  neutral: "bg-slate-400",
  brand: "bg-brand-600",
};

export interface StatusMeta {
  label: string;
  intent: Intent;
}

export function facilityStatusMeta(s: FacilityStatus): StatusMeta {
  const map: Record<FacilityStatus, Intent> = {
    open: "success", closed: "neutral", maintenance: "warning",
    weather_delay: "info", private_event: "brand",
  };
  return { label: FACILITY_STATUS_LABELS[s], intent: map[s] };
}

export function requestStatusMeta(s: RequestStatus): StatusMeta {
  const map: Record<RequestStatus, Intent> = {
    pending: "warning", approved: "success", denied: "danger", cancelled: "neutral",
  };
  return { label: REQUEST_STATUS_LABELS[s], intent: map[s] };
}

export function payrollStatusMeta(s: PayrollStatus): StatusMeta {
  const map: Record<PayrollStatus, Intent> = {
    ready: "info", needs_review: "warning", approved: "success", exported: "neutral",
  };
  return { label: PAYROLL_STATUS_LABELS[s], intent: map[s] };
}

export function certStatusMeta(s: CertStatus): StatusMeta {
  const map: Record<CertStatus, Intent> = {
    valid: "success", expiring: "warning", expired: "danger", missing: "neutral",
  };
  return { label: CERT_STATUS_LABELS[s], intent: map[s] };
}

export function issueStatusMeta(s: IssueStatus): StatusMeta {
  const map: Record<IssueStatus, Intent> = {
    new: "info", in_progress: "brand", waiting_parts: "warning", resolved: "success",
  };
  return { label: ISSUE_STATUS_LABELS[s], intent: map[s] };
}

export function priorityMeta(p: IssuePriority): StatusMeta {
  const map: Record<IssuePriority, Intent> = {
    low: "neutral", medium: "info", high: "warning", urgent: "danger",
  };
  return { label: ISSUE_PRIORITY_LABELS[p], intent: map[p] };
}

export function staffFlagMeta(f: StaffStatusFlag): StatusMeta {
  const map: Record<StaffStatusFlag, Intent> = {
    active: "success", pending_onboarding: "info", missing_forms: "warning",
    certification_expiring: "warning", inactive: "neutral", needs_review: "danger",
  };
  return { label: STAFF_FLAG_LABELS[f], intent: map[f] };
}
