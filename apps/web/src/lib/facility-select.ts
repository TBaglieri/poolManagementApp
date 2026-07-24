import type { Facility } from "@poolops/shared";

/**
 * Facility-selection policy, driven purely off how many facilities the tenant has.
 *
 * A single-facility tenant (e.g. Villas, one pool) should never be asked to pick a
 * facility — it's noise. Readings still attach to that facility; we just choose it
 * automatically and hide the picker. Two-plus facilities → show the picker as usual.
 * No per-tenant hardcoding: this is a function of `facilities.length`.
 */
export interface FacilityChoice {
  facilities: Facility[];
  /** The sole facility when the tenant has exactly one; otherwise null. */
  only: Facility | null;
  /** True when the tenant has exactly one facility → auto-select, hide the picker. */
  autoSelected: boolean;
  /** True when there are no facilities yet (show the "add a facility" empty state). */
  isEmpty: boolean;
}

export function resolveFacilityChoice(facilities: Facility[]): FacilityChoice {
  const only = facilities.length === 1 ? facilities[0] : null;
  return { facilities, only, autoSelected: !!only, isEmpty: facilities.length === 0 };
}

/**
 * The facility id a form should default to: the sole facility when there's exactly
 * one, otherwise the caller's current value (or the first facility as a fallback).
 */
export function defaultFacilityId(facilities: Facility[], current?: string): string {
  if (facilities.length === 1) return facilities[0].id;
  if (current && facilities.some((f) => f.id === current)) return current;
  return facilities[0]?.id ?? "";
}
