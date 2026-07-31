/**
 * PoolOps Pro — shared domain model.
 *
 * These interfaces are the single source of truth for both the web dashboard
 * (apps/web) and the mobile app (apps/mobile). They are intentionally
 * persistence-agnostic so the in-memory mock layer can later be swapped for
 * Prisma/Postgres/Supabase without touching feature code. See prisma/schema.prisma
 * for the matching relational sketch.
 */

export type ID = string;
/** ISO-8601 date-time string, e.g. "2026-06-13T14:30:00.000Z". */
export type ISODate = string;

/* -------------------------------------------------------------------------- */
/* Roles & permissions                                                         */
/* -------------------------------------------------------------------------- */

export type RoleSlug =
  | "super_admin"
  | "org_admin"
  | "ops_manager"
  | "lifeguard_manager"
  | "scheduling_manager"
  | "payroll_team"
  | "hr_coordinator"
  | "head_lifeguard"
  | "lifeguard"
  | "swim_instructor"
  | "maintenance"
  | "auditor";

/** Surface a role is primarily designed for. Drives post-login redirects. */
export type RoleSurface = "web" | "mobile" | "both";

export interface Role {
  slug: RoleSlug;
  name: string;
  shortName: string;
  description: string;
  surface: RoleSurface;
  /** Tailwind-friendly token used by StatusBadge / RoleBadge. */
  accent: "navy" | "cyan" | "teal" | "indigo" | "amber" | "emerald" | "rose" | "slate" | "violet";
  level: number; // 1 = lowest standard access, 100 = super admin
}

export type PermissionKey = string;

export interface StaffPermissionOverride {
  id: ID;
  staffId: ID;
  permission: PermissionKey;
  /** grant adds a permission the role lacks; revoke removes one the role has. */
  effect: "grant" | "revoke";
  grantedBy: ID;
  grantedAt: ISODate;
  note?: string;
}

/* -------------------------------------------------------------------------- */
/* Organization / facility / pool                                              */
/* -------------------------------------------------------------------------- */

export type OrganizationType =
  | "community_pool"
  | "swim_club"
  | "municipality"
  | "camp"
  | "school"
  | "private_aquatics_center";

export interface Organization {
  id: ID;
  name: string;
  type: OrganizationType;
  timezone: string;
  seasonStart: ISODate;
  seasonEnd: ISODate;
  accentColor: string;
  logoUrl?: string;
  plan: "starter" | "team" | "enterprise";
  createdAt: ISODate;
}

export type FacilityStatus = "open" | "closed" | "maintenance" | "weather_delay" | "private_event";
export type PoolType =
  | "outdoor_competition"
  | "indoor"
  | "wading"
  | "leisure"
  | "lap"
  | "therapy"
  | "splash_pad";

export interface ChemicalRange {
  freeChlorine: [number, number];
  combinedChlorine: [number, number];
  ph: [number, number];
  alkalinity: [number, number];
  calciumHardness: [number, number];
  cyanuricAcid: [number, number];
  waterTemp: [number, number];
}

export interface Facility {
  id: ID;
  orgId: ID;
  name: string;
  address: string;
  poolType: PoolType;
  operatingHours: string;
  capacity: number;
  emergencyPhone: string;
  managerId?: ID;
  status: FacilityStatus;
  chemicalRanges: ChemicalRange;
  inspectionRequired: boolean;
  imageHint: string; // gradient/emoji hint for the demo card
}

export interface Pool {
  id: ID;
  facilityId: ID;
  name: string;
  poolType: PoolType;
  volumeGallons: number;
  maxDepthFt: number;
}

/* -------------------------------------------------------------------------- */
/* People                                                                      */
/* -------------------------------------------------------------------------- */

export type EmploymentStatus = "active" | "pending_onboarding" | "inactive" | "seasonal" | "on_leave";

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface AvailabilityBlock {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  start: string; // "08:00"
  end: string; // "16:00"
  preference: "preferred" | "available" | "unavailable";
}

export type StaffStatusFlag =
  | "active"
  | "pending_onboarding"
  | "missing_forms"
  | "certification_expiring"
  | "inactive"
  | "needs_review";

export interface StaffProfile {
  id: ID;
  orgId: ID;
  userId: ID;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarColor: string;
  roles: RoleSlug[];
  primaryRole: RoleSlug;
  homeFacilityId: ID;
  facilityIds: ID[];
  age: number;
  isMinor: boolean;
  hireDate: ISODate;
  employmentStatus: EmploymentStatus;
  statusFlags: StaffStatusFlag[];
  emergencyContact: EmergencyContact;
  availability: AvailabilityBlock[];
  preferredHoursPerWeek: number;
  payRate: number; // USD/hour — placeholder, gated to payroll roles
  onboardingComplete: number; // 0-100
  documentsSubmitted: number;
  documentsRequired: number;
  permissionOverrides?: StaffPermissionOverride[];
  title: string;
}

/* -------------------------------------------------------------------------- */
/* Certifications                                                              */
/* -------------------------------------------------------------------------- */

export type CertificationType =
  | "lifeguard"
  | "cpr_aed"
  | "first_aid"
  | "wsi"
  | "cpo_afo"
  | "bloodborne_pathogens";

export type CertStatus = "valid" | "expiring" | "expired" | "missing";

export interface Certification {
  type: CertificationType;
  name: string;
  issuingBody: string;
  validMonths: number;
}

export interface StaffCertification {
  id: ID;
  staffId: ID;
  type: CertificationType;
  issuedDate: ISODate | null;
  expiresDate: ISODate | null;
  status: CertStatus;
  certNumber?: string;
}

/* -------------------------------------------------------------------------- */
/* Scheduling                                                                  */
/* -------------------------------------------------------------------------- */

export type ShiftPosition =
  | "lifeguard"
  | "head_lifeguard"
  | "swim_instructor"
  | "front_desk"
  | "maintenance"
  | "manager";

export interface Shift {
  id: ID;
  facilityId: ID;
  position: ShiftPosition;
  date: ISODate; // yyyy-mm-dd
  start: string; // "09:00"
  end: string; // "13:00"
  assignedStaffId: ID | null;
  status: "open" | "assigned" | "published" | "completed";
  notes?: string;
}

export interface ShiftAssignment {
  id: ID;
  shiftId: ID;
  staffId: ID;
  assignedAt: ISODate;
  assignedBy: ID;
}

export type RequestStatus = "pending" | "approved" | "denied" | "cancelled";

export interface TimeOffRequest {
  id: ID;
  staffId: ID;
  startDate: ISODate;
  endDate: ISODate;
  reason: string;
  type: "vacation" | "sick" | "personal" | "school" | "other";
  status: RequestStatus;
  submittedAt: ISODate;
  reviewedBy?: ID;
}

export interface ShiftTradeRequest {
  id: ID;
  shiftId: ID;
  requestedBy: ID;
  requestedTo: ID | null; // null = open to anyone
  reason: string;
  status: RequestStatus;
  submittedAt: ISODate;
}

/* -------------------------------------------------------------------------- */
/* Time clock & payroll                                                        */
/* -------------------------------------------------------------------------- */

export interface TimeClockEntry {
  id: ID;
  staffId: ID;
  facilityId: ID;
  clockIn: ISODate | null;
  clockOut: ISODate | null;
  breakMinutes: number;
  status: "clocked_in" | "clocked_out" | "missed_in" | "missed_out" | "late";
  flagged: boolean;
  note?: string;
}

export type PayrollStatus = "ready" | "needs_review" | "approved" | "exported";

export interface PayPeriod {
  id: ID;
  label: string;
  start: ISODate;
  end: ISODate;
  status: PayrollStatus;
}

export interface PayrollReview {
  id: ID;
  payPeriodId: ID;
  staffId: ID;
  regularHours: number;
  overtimeHours: number;
  status: PayrollStatus;
  hasMissingPunch: boolean;
  note?: string;
}

export interface PayrollExport {
  id: ID;
  payPeriodId: ID;
  createdAt: ISODate;
  createdBy: ID;
  format: "csv" | "adp" | "gusto" | "paychex";
  rowCount: number;
}

/* -------------------------------------------------------------------------- */
/* Onboarding                                                                  */
/* -------------------------------------------------------------------------- */

export type OnboardingStepKey =
  | "personal_info"
  | "emergency_contact"
  | "availability"
  | "certifications"
  | "tax_forms"
  | "handbook"
  | "direct_deposit"
  | "final_review";

export interface OnboardingTask {
  key: OnboardingStepKey;
  title: string;
  description: string;
  required: boolean;
  /** Documents collected at this step (placeholders only). */
  documents?: string[];
}

export type SubmissionStatus = "not_started" | "in_progress" | "submitted" | "approved" | "rejected";

export interface OnboardingSubmission {
  id: ID;
  staffId: ID;
  step: OnboardingStepKey;
  status: SubmissionStatus;
  submittedAt?: ISODate;
  reviewedBy?: ID;
}

/* -------------------------------------------------------------------------- */
/* Documents                                                                   */
/* -------------------------------------------------------------------------- */

export type DocumentCategory =
  | "employee_handbook"
  | "safety_procedures"
  | "sds_sheets"
  | "tax_forms"
  | "training_materials"
  | "lesson_plans"
  | "facility_permits"
  | "inspection_reports"
  | "payroll_documents";

export interface Document {
  id: ID;
  orgId: ID;
  name: string;
  category: DocumentCategory;
  uploadedBy: ID;
  uploadedAt: ISODate;
  sizeKb: number;
  fileType: "pdf" | "docx" | "xlsx" | "png" | "jpg";
  tags: string[];
  /** Roles allowed to view; empty = all staff. Sensitive items are restricted. */
  visibleToRoles: RoleSlug[];
  requiresAcknowledgment: boolean;
  sensitive: boolean;
}

/* -------------------------------------------------------------------------- */
/* Communications                                                              */
/* -------------------------------------------------------------------------- */

export type ChannelKind = "all_staff" | "role" | "facility" | "admin" | "group" | "dm";

/** How a channel behaves: a broadcast announcement channel, a custom group chat, or a 1:1 DM. */
export type ChatType = "announcement" | "group" | "dm";

export interface Channel {
  id: ID;
  name: string;
  kind: ChannelKind;
  description: string;
  facilityId?: ID;
  restrictedToRoles?: RoleSlug[];
  unread: number;
  /** Surface this channel is. Absent → an announcement channel (back-compat). */
  chatType?: ChatType;
  /** Tenant this channel belongs to — chats and DMs never cross tenants. */
  organizationId?: ID;
  /** staff_profiles.id of the creator (for group/dm) — creators can manage members. */
  createdBy?: ID;
  /** Explicit member roster for group chats and DMs (staff_profiles.ids). */
  memberIds?: ID[];
  /** Transient: raw channel_members.profile_ids from the DB, reverse-mapped to
   *  memberIds (staff ids) on hydrate via the staff roster. Not persisted in-store. */
  memberProfileIds?: ID[];
}

export type MessageKind =
  | "message" | "announcement" | "schedule_publish" | "weather_alert" | "shift_coverage";

export interface Message {
  id: ID;
  channelId: ID;
  senderId: ID;
  body: string;
  sentAt: ISODate;
  pinned: boolean;
  priority?: "normal" | "urgent";
  kind?: MessageKind;
  template?: MessageTemplateKey;
  linkUrl?: string;
  attachments?: { name: string; type: string }[];
}

export type MessageTemplateKey =
  | "weather_delay"
  | "shift_reminder"
  | "missing_certification"
  | "emergency_closing"
  | "pool_closed"
  | "schedule_published";

/* -------------------------------------------------------------------------- */
/* Facility operations                                                         */
/* -------------------------------------------------------------------------- */

export interface ChemicalLog {
  id: ID;
  facilityId: ID;
  poolId: ID;
  /** When the reading was actually TAKEN (tenant-timezone aware, user-editable). */
  takenAt?: ISODate;
  /** When the record was created/logged (audit trail — set by the system). */
  recordedAt: ISODate;
  recordedBy: ID;
  freeChlorine: number;
  combinedChlorine: number;
  ph: number;
  alkalinity: number;
  calciumHardness: number;
  cyanuricAcid: number;
  waterTemp: number;
  notes?: string;
  correctiveAction?: string;
  outOfRange: string[]; // field keys flagged out of range
}

export interface ChecklistItem {
  id: ID;
  label: string;
  requiresNote?: boolean;
}

export type ChecklistKind =
  | "opening"
  | "closing"
  | "lifeguard_stand"
  | "bathroom"
  | "first_aid_kit"
  | "weather_safety";

export type ChecklistCadence = "daily" | "per_shift" | "weekly" | "custom";

export interface ChecklistTemplate {
  id: ID;
  name: string;
  kind: ChecklistKind;
  facilityIds: ID[];
  cadence: ChecklistCadence;
  items: ChecklistItem[];
  /** Archived templates are hidden from the run list but keep their history. */
  archived?: boolean;
}

export interface ChecklistCompletion {
  id: ID;
  templateId: ID;
  facilityId: ID;
  completedBy: ID;
  completedAt: ISODate;
  status: "complete" | "incomplete" | "missed";
  checkedItemIds: ID[];
  note?: string;
}

export interface ShiftReport {
  id: ID;
  facilityId: ID;
  staffId: ID;
  shiftLabel: string;
  date: ISODate;
  weather: string;
  staffingNotes: string;
  incidents: string;
  maintenanceConcerns: string;
  patronIssues: string;
  suppliesNeeded: string;
  managerNotes?: string;
  reviewStatus: "submitted" | "reviewed" | "flagged";
}

export interface PatronCount {
  id: ID;
  facilityId: ID;
  recordedAt: ISODate;
  recordedBy: ID;
  timeSlot: string; // "14:00"
  count: number;
}

export type IssuePriority = "low" | "medium" | "high" | "urgent";
export type IssueStatus = "new" | "in_progress" | "waiting_parts" | "resolved";

export interface MaintenanceIssue {
  id: ID;
  facilityId: ID;
  area: string;
  title: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  reportedBy: ID;
  assignedTo: ID | null;
  reportedAt: ISODate;
  dueDate?: ISODate;
  hasPhoto: boolean;
}

export type InspectionFeature =
  | "diving_board"
  | "starting_blocks"
  | "slide"
  | "ladders"
  | "lane_lines"
  | "lifeguard_stands"
  | "rescue_tubes"
  | "aed"
  | "first_aid_stations";

export interface InspectionTemplate {
  id: ID;
  name: string;
  feature: InspectionFeature;
  cadenceDays: number;
  checkpoints: string[];
}

export interface InspectionResult {
  id: ID;
  templateId: ID;
  facilityId: ID;
  inspectedBy: ID;
  inspectedAt: ISODate;
  result: "pass" | "fail" | "needs_attention";
  notes?: string;
  hasPhoto: boolean;
}

/* -------------------------------------------------------------------------- */
/* Lessons & members                                                           */
/* -------------------------------------------------------------------------- */

export type LessonLevel = "beginner" | "intermediate" | "advanced" | "private" | "parent_child";

export interface LessonClass {
  id: ID;
  facilityId: ID;
  name: string;
  level: LessonLevel;
  instructorId: ID;
  dayOfWeek: string;
  start: string;
  end: string;
  capacity: number;
  enrolled: number;
  startDate: ISODate;
  endDate: ISODate;
}

export interface LessonRegistration {
  id: ID;
  classId: ID;
  memberId: ID;
  studentName: string;
  studentAge: number;
  attendance: { date: ISODate; present: boolean }[];
  progressNotes: { date: ISODate; note: string; author: ID }[];
}

export type MembershipStatus = "active" | "expired" | "pending" | "frozen";

export interface Household {
  id: ID;
  orgId: ID;
  name: string;
  primaryContact: string;
  email: string;
  phone: string;
  address: string;
  membershipStatus: MembershipStatus;
  waiverSigned: boolean;
  memberIds: ID[];
  notes?: string;
}

export interface Member {
  id: ID;
  householdId: ID;
  firstName: string;
  lastName: string;
  age: number;
  isPrimary: boolean;
  emergencyContact?: EmergencyContact;
}

/* -------------------------------------------------------------------------- */
/* Audit & notifications                                                       */
/* -------------------------------------------------------------------------- */

export interface AuditLog {
  id: ID;
  actorId: ID;
  action: string;
  target: string;
  at: ISODate;
  sensitive: boolean;
}

export type NotificationKind = "approval" | "alert" | "reminder" | "message" | "system";

export interface Notification {
  id: ID;
  kind: NotificationKind;
  title: string;
  body: string;
  at: ISODate;
  read: boolean;
  href?: string;
}

/* -------------------------------------------------------------------------- */
/* Convenience composite used by the demo "current user" concept               */
/* -------------------------------------------------------------------------- */

export interface SessionUser {
  staffId: ID;
  role: RoleSlug;
  facilityId: ID;
}
