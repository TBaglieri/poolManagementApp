import { describe, it, expect } from "vitest";
import {
  validateEmail, validatePassword, checkDuplicateEmail, inviteAcceptable, parseBulkEmails,
} from "./accounts";

describe("email validation", () => {
  it("accepts good emails, rejects bad ones", () => {
    expect(validateEmail("guard@villas.example").ok).toBe(true);
    expect(validateEmail("").ok).toBe(false);
    expect(validateEmail("nope").ok).toBe(false);
    expect(validateEmail("a@b").ok).toBe(false);
  });
});

describe("password policy", () => {
  it("requires 8+ chars with a letter and a number", () => {
    expect(validatePassword("short1").ok).toBe(false);         // too short
    expect(validatePassword("allletters").ok).toBe(false);      // no number
    expect(validatePassword("12345678").ok).toBe(false);        // no letter
    expect(validatePassword("guardpass1").ok).toBe(true);
  });
  it("gives specific messages", () => {
    expect(validatePassword("abc").error).toMatch(/8 characters/);
    expect(validatePassword("abcdefgh").error).toMatch(/number/);
  });
});

describe("duplicate email guard", () => {
  it("is case-insensitive", () => {
    expect(checkDuplicateEmail("A@x.com", ["a@x.com"]).ok).toBe(false);
    expect(checkDuplicateEmail("new@x.com", ["a@x.com"]).ok).toBe(true);
  });
});

describe("invite acceptability (reused / revoked / expired)", () => {
  const future = new Date(Date.now() + 86400_000).toISOString();
  const past = new Date(Date.now() - 86400_000).toISOString();

  it("accepts a valid pending invite", () => {
    expect(inviteAcceptable({ status: "sent", expiresAt: future }).ok).toBe(true);
  });
  it("rejects a missing invite", () => {
    expect(inviteAcceptable(null).ok).toBe(false);
  });
  it("rejects a reused invite", () => {
    expect(inviteAcceptable({ status: "accepted", expiresAt: future }).error).toMatch(/already been used/);
  });
  it("rejects a revoked invite", () => {
    expect(inviteAcceptable({ status: "canceled", expiresAt: future }).error).toMatch(/revoked/);
  });
  it("rejects an expired invite by date", () => {
    expect(inviteAcceptable({ status: "sent", expiresAt: past }).error).toMatch(/expired/);
  });
});

describe("bulk email parsing (invite ~10 guards at once)", () => {
  it("splits, dedupes, lowercases, and separates invalid tokens", () => {
    const { emails, invalid } = parseBulkEmails("A@x.com, b@x.com\nA@x.com  bad  c@x.com;d@x.com");
    expect(emails).toEqual(["a@x.com", "b@x.com", "c@x.com", "d@x.com"]);
    expect(invalid).toEqual(["bad"]);
  });
});
