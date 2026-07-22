/**
 * Pure (JSX-free) tenant-scoped reference data resolver — see tenant-data.ts for
 * the React hook wrapper. Split out so it's unit-testable without importing the
 * client provider.
 */
import {
  facilities as seedFacilities, staff as seedStaff, staffCertifications as seedCerts,
  lessonClasses as seedLessons, lessonRegistrations as seedLessonRegs, households as seedHouseholds,
  members as seedMembers, documents as seedDocuments, inspectionResults as seedInspections,
  pools as seedPools,
  type Facility, type StaffProfile, type StaffCertification, type LessonClass, type LessonRegistration,
  type Household, type Member, type Document, type InspectionResult, type Pool,
} from "@poolops/shared";

export interface TenantSeed {
  /** True only in the gated demo tenant. */
  demo: boolean;
  facilities: Facility[];
  staff: StaffProfile[];
  staffCertifications: StaffCertification[];
  lessonClasses: LessonClass[];
  lessonRegistrations: LessonRegistration[];
  households: Household[];
  members: Member[];
  documents: Document[];
  inspectionResults: InspectionResult[];
  pools: Pool[];
}

const EMPTY: Omit<TenantSeed, "demo"> = {
  facilities: [], staff: [], staffCertifications: [], lessonClasses: [], lessonRegistrations: [],
  households: [], members: [], documents: [], inspectionResults: [], pools: [],
};

const DEMO: Omit<TenantSeed, "demo"> = {
  facilities: seedFacilities, staff: seedStaff, staffCertifications: seedCerts,
  lessonClasses: seedLessons, lessonRegistrations: seedLessonRegs, households: seedHouseholds,
  members: seedMembers, documents: seedDocuments, inspectionResults: seedInspections, pools: seedPools,
};

/** Demo dataset for the demo tenant, empty arrays otherwise. */
export function tenantSeed(demo: boolean): TenantSeed {
  return { demo, ...(demo ? DEMO : EMPTY) };
}
