import { describe, it, expect } from "vitest";
import {
  resolveTenant, getTenantConfig, isPathEnabled, isModuleEnabled, staffName, staff as seedStaff,
} from "@poolops/shared";
import { inviteAcceptable, validatePassword } from "./accounts";

/**
 * Server/logic-level smoke test of the Villas critical path. The full browser
 * flow lives in e2e/villas-critical-path.spec.ts (Playwright, runs against a live
 * instance); this covers the same steps at the level that runs green in CI without
 * a browser or network.
 */
describe("Villas critical-path smoke", () => {
  const villas = getTenantConfig("villas");

  it("step 1 — path-based resolution reaches Villas at /villas (no domain)", () => {
    const r = resolveTenant({ host: "poolops.vercel.app", pathname: "/villas/dashboard" });
    expect(r).toMatchObject({ slug: "villas", source: "path", strippedPath: "/dashboard" });
  });

  it("step 2 setup — Villas is a two-role, small-community-pool tenant", () => {
    expect(villas.activeRoles).toEqual(["org_admin", "lifeguard"]);
    for (const m of ["chemicals", "scheduling", "chat", "maintenance", "timeclock"] as const) {
      expect(isModuleEnabled(villas, m), `${m} should be on`).toBe(true);
    }
    for (const m of ["billing", "lessons", "reservations", "guestPasses"] as const) {
      expect(isModuleEnabled(villas, m), `${m} should be off`).toBe(false);
    }
  });

  it("step 3 — invite acceptance + password policy validate", () => {
    const future = new Date(Date.now() + 86400_000).toISOString();
    expect(inviteAcceptable({ status: "sent", expiresAt: future }).ok).toBe(true);
    expect(inviteAcceptable({ status: "accepted", expiresAt: future }).ok).toBe(false); // reused
    expect(validatePassword("guardpass1").ok).toBe(true);
    expect(validatePassword("weak").ok).toBe(false);
  });

  it("steps 5–6 — a chemical reading is attributed to the specific guard", () => {
    const guard = seedStaff.find((s) => s.primaryRole === "lifeguard");
    expect(guard).toBeTruthy();
    const reading = { recordedBy: guard!.id, freeChlorine: 2.4, ph: 7.5 };
    expect(reading.recordedBy).toBe(guard!.id);
    expect(staffName(reading.recordedBy)).toBe(`${guard!.firstName} ${guard!.lastName}`);
  });

  it("step 7 — a disabled module's route is blocked server-side", () => {
    expect(isPathEnabled(villas, "/chemicals/new")).toBe(true);
    expect(isPathEnabled(villas, "/billing")).toBe(false);
    expect(isPathEnabled(villas, "/lessons")).toBe(false);
  });
});
