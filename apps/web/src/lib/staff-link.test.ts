import { describe, it, expect } from "vitest";
import { staffProfileState } from "./access";

/**
 * §4e — a signed-in staff user with no linked staff_profiles row must fail loudly
 * (the "unlinked" state), never silently show empty self-service data. Demo mode
 * always resolves (demo staff identity).
 */
describe("staffProfileState", () => {
  it("real + linked id → ok", () => {
    expect(staffProfileState("real", "staff-uuid", true)).toBe("ok");
    expect(staffProfileState("real", "staff-uuid", null)).toBe("ok");
  });

  it("real + no id and not linked → unlinked (fail loud)", () => {
    expect(staffProfileState("real", null, false)).toBe("unlinked");
    expect(staffProfileState("real", null, null)).toBe("unlinked");
  });

  it("real + staffLinked true but id not yet stored → ok", () => {
    expect(staffProfileState("real", null, true)).toBe("ok");
  });

  it("demo mode is always resolved", () => {
    expect(staffProfileState("demo", null, null)).toBe("demo");
    expect(staffProfileState("demo", "demo-staff-1", true)).toBe("demo");
  });
});
