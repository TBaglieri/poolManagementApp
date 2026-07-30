import { describe, it, expect } from "vitest";
import {
  enabledChemicalFields, flagOutOfRange, CHEMICAL_FIELD_KEYS,
  getTenantConfig, DEFAULT_CHEMICAL_RANGES,
} from "../index";

/**
 * Fix 4 — chemical fields are PER-TENANT config, not hardcoded. Villas records only
 * chlorine + pH; every other tenant keeps the full panel by default.
 */
describe("enabledChemicalFields — per-tenant chemical panel", () => {
  it("Villas records only free chlorine + pH", () => {
    const keys = enabledChemicalFields(getTenantConfig("villas")).map((f) => f.key);
    expect(keys).toEqual(["freeChlorine", "ph"]);
  });

  it("a tenant with no override keeps the full panel (unchanged behavior)", () => {
    const keys = enabledChemicalFields(getTenantConfig("default")).map((f) => f.key);
    expect(keys).toEqual([...CHEMICAL_FIELD_KEYS]);
  });

  it("keeps canonical field order regardless of config order", () => {
    const keys = enabledChemicalFields({ operations: { chemicalFields: ["ph", "freeChlorine"] } }).map((f) => f.key);
    expect(keys).toEqual(["freeChlorine", "ph"]); // canonical order, not config order
  });

  it("undefined / empty config → full panel", () => {
    expect(enabledChemicalFields(undefined).map((f) => f.key)).toEqual([...CHEMICAL_FIELD_KEYS]);
    expect(enabledChemicalFields({ operations: { chemicalFields: [] } }).map((f) => f.key)).toEqual([...CHEMICAL_FIELD_KEYS]);
  });
});

describe("flagOutOfRange — alerts respect the tenant's enabled fields", () => {
  const villasKeys = ["freeChlorine", "ph"];
  // pH 8.4 and free chlorine 0.2 are out of the default safe ranges; combined
  // chlorine 2.0 is also out of range — but Villas doesn't record it.
  const reading = { freeChlorine: 0.2, combinedChlorine: 2.0, ph: 8.4, alkalinity: 100, calciumHardness: 280, cyanuricAcid: 40, waterTemp: 82 };

  it("still fires for chlorine and pH under Villas' config", () => {
    const flags = flagOutOfRange(DEFAULT_CHEMICAL_RANGES, reading, villasKeys);
    expect(flags).toContain("freeChlorine");
    expect(flags).toContain("ph");
  });

  it("never flags a field the tenant doesn't record (combined chlorine)", () => {
    const flags = flagOutOfRange(DEFAULT_CHEMICAL_RANGES, reading, villasKeys);
    expect(flags).not.toContain("combinedChlorine");
    expect(flags.sort()).toEqual(["freeChlorine", "ph"]);
  });

  it("with the full panel (no restriction), every out-of-range field is flagged", () => {
    const flags = flagOutOfRange(DEFAULT_CHEMICAL_RANGES, reading);
    expect(flags).toEqual(expect.arrayContaining(["freeChlorine", "combinedChlorine", "ph"]));
  });

  it("in-range values under Villas' config produce no flags", () => {
    const ok = { ...reading, freeChlorine: 2.4, ph: 7.5 };
    expect(flagOutOfRange(DEFAULT_CHEMICAL_RANGES, ok, villasKeys)).toEqual([]);
  });
});
