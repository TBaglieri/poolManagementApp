import type {
  CertificationType, Facility, ID, ISODate, ShiftPosition, StaffCertification,
  StaffProfile, TimeOffRequest,
} from "@poolops/shared";

export type DraftStatus = "draft" | "needs_review" | "ready" | "published" | "failed";

export type SchedulePriority = "preferences" | "balanced";

/** A recurring staffing need derived from facility hours + coverage rules. */
export interface StaffingRequirement {
  id: string;
  facilityId: ID;
  label: string;
  position: ShiftPosition;
  certificationRequired?: CertificationType;
  daysOfWeek: number[]; // 0 = Monday … 6 = Sunday
  start: string; // "08:00"
  end: string;
  staffCount: number;
}

export interface StaffingTemplate {
  id: string;
  name: string;
  facilityId: ID | "all";
  requirements: StaffingRequirement[];
}

export interface GenerateSettings {
  facilityId: ID | "all";
  weekStart: string; // yyyy-mm-dd (Monday)
  templateId: string;
  includeOpenShifts: boolean;
  priority: SchedulePriority;
  avoidOvertime: boolean;
  maxHoursDefault: number; // overtime threshold
}

export type WarningType = "overtime" | "minor" | "missing_cert" | "coverage_gap" | "availability";

export interface DraftWarning {
  type: WarningType;
  message: string;
  staffId?: ID;
}

export interface DraftShift {
  id: string;
  facilityId: ID;
  date: string; // yyyy-mm-dd
  position: ShiftPosition;
  certificationRequired?: CertificationType;
  start: string;
  end: string;
  assignedStaffId: ID | null;
  isOpenShift: boolean;
  hours: number;
  label: string;
  warnings: DraftWarning[];
}

export interface StaffHourTotal {
  staffId: ID;
  name: string;
  hours: number;
  shifts: number;
  preferredMax: number;
  overtime: boolean;
}

export type ConflictType = "time_off" | "availability" | "double_book" | "missing_cert";

export interface AvoidedConflict {
  type: ConflictType;
  staffId: ID;
  detail: string;
}

export interface ScheduleDraft {
  id: string;
  facilityId: ID | "all";
  weekStart: string;
  status: DraftStatus;
  generatedBy: ID;
  generatedAt: ISODate;
  settings: GenerateSettings;
  shifts: DraftShift[];
  warnings: DraftWarning[];
  coverageScore: number; // 0-100
  staffHourTotals: StaffHourTotal[];
  unfilledCount: number;
  avoidedConflicts: AvoidedConflict[];
  suggestedFixes: string[];
}

export interface GenerateInput {
  facilities: Facility[];
  template: StaffingTemplate;
  staff: StaffProfile[];
  approvedTimeOff: TimeOffRequest[];
  certifications: StaffCertification[];
  settings: GenerateSettings;
  generatedBy: ID;
  /** Hours already worked this week per staff (seeds overtime detection). */
  priorHours?: Record<ID, number>;
}
