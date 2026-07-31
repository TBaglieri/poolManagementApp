import type { Facility, ID, StaffProfile } from "../types";
import * as seed from "./seed";

export * from "./seed";
export * from "./labels";
export * from "./pricing";
export * from "./chem-months";
export * from "./checklist-day";

/** Convenience lookup maps over the demo dataset. */
export const staffById: Record<ID, StaffProfile> = Object.fromEntries(
  seed.staff.map((s) => [s.id, s]),
);
export const facilityById: Record<ID, Facility> = Object.fromEntries(
  seed.facilities.map((f) => [f.id, f]),
);

export function getStaff(id: ID | null | undefined): StaffProfile | undefined {
  return id ? staffById[id] : undefined;
}

export function staffName(id: ID | null | undefined): string {
  const s = getStaff(id);
  return s ? `${s.firstName} ${s.lastName}` : "Unassigned";
}

export function staffFirstName(id: ID | null | undefined): string {
  return getStaff(id)?.firstName ?? "Unassigned";
}

export function getFacility(id: ID | null | undefined): Facility | undefined {
  return id ? facilityById[id] : undefined;
}

export function facilityName(id: ID | null | undefined): string {
  return getFacility(id)?.name ?? "All Facilities";
}

export function staffForFacility(facilityId: ID): StaffProfile[] {
  return seed.staff.filter((s) => s.facilityIds.includes(facilityId));
}

export function certificationsForStaff(staffId: ID) {
  return seed.staffCertifications.filter((c) => c.staffId === staffId);
}
