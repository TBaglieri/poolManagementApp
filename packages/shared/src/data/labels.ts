import type {
  CertStatus, CertificationType, ChannelKind, ChemicalRange, DocumentCategory, EmploymentStatus,
  FacilityStatus, InspectionFeature, IssuePriority, IssueStatus, LessonLevel,
  MessageTemplateKey, OnboardingStepKey, OrganizationType, PayrollStatus, PoolType,
  RequestStatus, ShiftPosition, StaffStatusFlag, SubmissionStatus,
} from "../types";

export const ORG_TYPE_LABELS: Record<OrganizationType, string> = {
  community_pool: "Community Pool",
  swim_club: "Swim Club",
  municipality: "Municipality",
  camp: "Summer Camp",
  school: "School / University",
  private_aquatics_center: "Private Aquatics Center",
};

export const FACILITY_STATUS_LABELS: Record<FacilityStatus, string> = {
  open: "Open",
  closed: "Closed",
  maintenance: "Maintenance",
  weather_delay: "Weather Delay",
  private_event: "Private Event",
};

export const POOL_TYPE_LABELS: Record<PoolType, string> = {
  outdoor_competition: "Outdoor Competition",
  indoor: "Indoor",
  wading: "Wading",
  leisure: "Leisure",
  lap: "Lap Pool",
  therapy: "Therapy",
  splash_pad: "Splash Pad",
};

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: "Active",
  pending_onboarding: "Pending Onboarding",
  inactive: "Inactive",
  seasonal: "Seasonal",
  on_leave: "On Leave",
};

export const STAFF_FLAG_LABELS: Record<StaffStatusFlag, string> = {
  active: "Active",
  pending_onboarding: "Pending Onboarding",
  missing_forms: "Missing Forms",
  certification_expiring: "Cert Expiring",
  inactive: "Inactive",
  needs_review: "Needs Review",
};

export const CERT_TYPE_LABELS: Record<CertificationType, string> = {
  lifeguard: "Lifeguard",
  cpr_aed: "CPR / AED",
  first_aid: "First Aid",
  wsi: "Water Safety Instructor",
  cpo_afo: "CPO / AFO",
  bloodborne_pathogens: "Bloodborne Pathogens",
};

export const CERT_STATUS_LABELS: Record<CertStatus, string> = {
  valid: "Valid",
  expiring: "Expiring Soon",
  expired: "Expired",
  missing: "Missing",
};

export const SHIFT_POSITION_LABELS: Record<ShiftPosition, string> = {
  lifeguard: "Lifeguard",
  head_lifeguard: "Head Lifeguard",
  swim_instructor: "Swim Instructor",
  front_desk: "Front Desk",
  maintenance: "Maintenance",
  manager: "Manager",
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  denied: "Denied",
  cancelled: "Cancelled",
};

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  ready: "Ready",
  needs_review: "Needs Review",
  approved: "Approved",
  exported: "Exported",
};

export const ISSUE_PRIORITY_LABELS: Record<IssuePriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  waiting_parts: "Waiting on Parts",
  resolved: "Resolved",
};

export const INSPECTION_FEATURE_LABELS: Record<InspectionFeature, string> = {
  diving_board: "Diving Boards",
  starting_blocks: "Starting Blocks",
  slide: "Slides",
  ladders: "Ladders",
  lane_lines: "Lane Lines",
  lifeguard_stands: "Lifeguard Stands",
  rescue_tubes: "Rescue Tubes",
  aed: "AED",
  first_aid_stations: "First-Aid Stations",
};

export const LESSON_LEVEL_LABELS: Record<LessonLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  private: "Private Lesson",
  parent_child: "Parent / Child",
};

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  employee_handbook: "Employee Handbook",
  safety_procedures: "Safety Procedures",
  sds_sheets: "SDS Sheets",
  tax_forms: "Tax Forms",
  training_materials: "Training Materials",
  lesson_plans: "Lesson Plans",
  facility_permits: "Facility Permits",
  inspection_reports: "Inspection Reports",
  payroll_documents: "Payroll Documents",
};

export const CHANNEL_KIND_LABELS: Record<ChannelKind, string> = {
  all_staff: "All Staff",
  role: "Role Channel",
  facility: "Facility Channel",
  admin: "Admin / Payroll",
};

export const MESSAGE_TEMPLATE_LABELS: Record<MessageTemplateKey, string> = {
  weather_delay: "Weather Delay",
  shift_reminder: "Shift Reminder",
  missing_certification: "Missing Certification",
  emergency_closing: "Emergency Closing",
  pool_closed: "Pool Closed",
  schedule_published: "Schedule Published",
};

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Needs Changes",
};

export const ONBOARDING_STEP_LABELS: Record<OnboardingStepKey, string> = {
  personal_info: "Personal Information",
  emergency_contact: "Emergency Contact",
  availability: "Availability",
  certifications: "Certifications",
  tax_forms: "Tax Forms",
  handbook: "Handbook Acknowledgment",
  direct_deposit: "Direct Deposit",
  final_review: "Final Review",
};

/** Chemical field metadata for forms, tables, and range checks. */
export const CHEMICAL_FIELDS = [
  { key: "freeChlorine", label: "Free Chlorine", unit: "ppm", short: "FC" },
  { key: "combinedChlorine", label: "Combined Chlorine", unit: "ppm", short: "CC" },
  { key: "ph", label: "pH", unit: "", short: "pH" },
  { key: "alkalinity", label: "Total Alkalinity", unit: "ppm", short: "TA" },
  { key: "calciumHardness", label: "Calcium Hardness", unit: "ppm", short: "CH" },
  { key: "cyanuricAcid", label: "Cyanuric Acid", unit: "ppm", short: "CYA" },
  { key: "waterTemp", label: "Water Temp", unit: "°F", short: "Temp" },
] as const;

export type ChemicalFieldMeta = (typeof CHEMICAL_FIELDS)[number];
export type ChemicalFieldKey = ChemicalFieldMeta["key"];

/** All chemical field keys, in canonical order — the full panel every tenant gets by default. */
export const CHEMICAL_FIELD_KEYS = CHEMICAL_FIELDS.map((f) => f.key) as readonly ChemicalFieldKey[];

/**
 * The chemical fields ACTIVE for a tenant, in canonical order. Which fields a tenant
 * records is per-tenant config (`operations.chemicalFields`) — NEVER hardcoded. When
 * unset or empty, every tenant gets the full panel, so existing tenants are unchanged;
 * Villas sets only ["freeChlorine", "ph"] and so logs just chlorine + pH.
 */
export function enabledChemicalFields(
  config?: { operations?: { chemicalFields?: readonly string[] } },
): ChemicalFieldMeta[] {
  const enabled = config?.operations?.chemicalFields;
  if (!enabled || enabled.length === 0) return [...CHEMICAL_FIELDS];
  const active = new Set(enabled);
  return CHEMICAL_FIELDS.filter((f) => active.has(f.key));
}

/**
 * Flag the chemical values outside their configured safe ranges. When `enabledKeys`
 * is given, ONLY those fields are checked — so a tenant that doesn't record a field
 * (e.g. Villas + combined chlorine) can never trip an out-of-range alert on it, while
 * the fields it DOES record (chlorine, pH) still fire normally.
 */
export function flagOutOfRange(
  ranges: ChemicalRange,
  values: Partial<Record<ChemicalFieldKey, number>>,
  enabledKeys?: readonly string[],
): string[] {
  const allow = enabledKeys && enabledKeys.length > 0 ? new Set(enabledKeys) : null;
  return (Object.keys(ranges) as ChemicalFieldKey[]).filter((k) => {
    if (allow && !allow.has(k)) return false;
    const [min, max] = ranges[k];
    const v = values[k];
    return typeof v === "number" && Number.isFinite(v) && (v < min || v > max);
  });
}
