import { describe, it, expect } from "vitest";
import { validatePasswordChange, RESET_REQUEST_NEUTRAL_MESSAGE } from "./accounts";

describe("change-password validation", () => {
  it("requires the current password", () => {
    expect(validatePasswordChange("", "newpass1", "newpass1").ok).toBe(false);
  });
  it("enforces the password policy on the new password", () => {
    expect(validatePasswordChange("old", "short", "short").ok).toBe(false);      // too short
    expect(validatePasswordChange("old", "alphabetonly", "alphabetonly").ok).toBe(false); // no digit
  });
  it("requires the confirmation to match", () => {
    expect(validatePasswordChange("old", "newpass1", "newpass2").ok).toBe(false);
  });
  it("rejects reusing the current password", () => {
    expect(validatePasswordChange("samepass1", "samepass1", "samepass1").ok).toBe(false);
  });
  it("accepts a valid, confirmed, different new password", () => {
    expect(validatePasswordChange("oldpass1", "newpass1", "newpass1")).toEqual({ ok: true, error: null });
  });
});

describe("forgot-password neutral response", () => {
  it("never reveals whether an email has an account", () => {
    // The SAME message is used for every request, existing email or not.
    expect(RESET_REQUEST_NEUTRAL_MESSAGE).toMatch(/if an account exists/i);
    expect(RESET_REQUEST_NEUTRAL_MESSAGE).not.toMatch(/no account|doesn't exist|not found/i);
  });
});
