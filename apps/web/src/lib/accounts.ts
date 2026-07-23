/**
 * Account / invite validation — pure, framework-free helpers shared by the
 * invite-accept flow, the admin invite UI, and the API routes so the same rules
 * are enforced client- and server-side. Unit-tested in accounts.test.ts.
 */

export interface Validation {
  ok: boolean;
  error: string | null;
}

const OK: Validation = { ok: true, error: null };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): Validation {
  const e = email.trim();
  if (!e) return { ok: false, error: "Enter an email address." };
  if (!EMAIL_RE.test(e)) return { ok: false, error: "That doesn't look like a valid email address." };
  return OK;
}

/** Password policy: at least 8 chars, with a letter and a number. */
export function validatePassword(pw: string): Validation {
  if (!pw) return { ok: false, error: "Choose a password." };
  if (pw.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  if (!/[a-zA-Z]/.test(pw)) return { ok: false, error: "Password must include a letter." };
  if (!/[0-9]/.test(pw)) return { ok: false, error: "Password must include a number." };
  return OK;
}

/**
 * Validate a change-password form: a current password must be present, the new one
 * must meet the policy, match its confirmation, and differ from the current. Pure —
 * no secrets are logged or returned. The CURRENT password is verified against auth
 * separately (by re-authenticating), never here.
 */
export function validatePasswordChange(current: string, next: string, confirm: string): Validation {
  if (!current) return { ok: false, error: "Enter your current password." };
  const pw = validatePassword(next);
  if (!pw.ok) return pw;
  if (next !== confirm) return { ok: false, error: "New passwords don't match." };
  if (next === current) return { ok: false, error: "Choose a password different from your current one." };
  return OK;
}

/**
 * The single, NEUTRAL response for a password-reset request — identical whether or
 * not an account exists, so we never reveal which emails are registered.
 */
export const RESET_REQUEST_NEUTRAL_MESSAGE =
  "If an account exists for that email, a password reset link has been sent. If you don't receive it, contact your administrator.";

/** Reject an email that already has an account/invite (case-insensitive). */
export function checkDuplicateEmail(email: string, existing: string[]): Validation {
  const e = email.trim().toLowerCase();
  if (existing.some((x) => x.trim().toLowerCase() === e)) {
    return { ok: false, error: "An account or invite already exists for this email." };
  }
  return OK;
}

export interface InviteLike {
  status: "draft" | "sent" | "pending" | "accepted" | "expired" | "canceled";
  expiresAt: string;
}

/** Is an invitation still acceptable? Covers reused, revoked, and expired invites. */
export function inviteAcceptable(invite: InviteLike | null | undefined, now: Date = new Date()): Validation {
  if (!invite) return { ok: false, error: "This invitation link is invalid or was not found." };
  if (invite.status === "accepted") return { ok: false, error: "This invitation has already been used. Ask your admin to send a new one." };
  if (invite.status === "canceled") return { ok: false, error: "This invitation was revoked. Ask your admin to send a new one." };
  if (invite.status === "expired") return { ok: false, error: "This invitation has expired. Ask your admin to resend it." };
  if (new Date(invite.expiresAt).getTime() < now.getTime()) {
    return { ok: false, error: "This invitation has expired. Ask your admin to resend it." };
  }
  return OK;
}

/** Parse a bulk email paste (newline/comma/space separated) into unique, valid emails. */
export function parseBulkEmails(raw: string): { emails: string[]; invalid: string[] } {
  const tokens = raw.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);
  const emails: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const t of tokens) {
    const lower = t.toLowerCase();
    if (!validateEmail(t).ok) { invalid.push(t); continue; }
    if (seen.has(lower)) continue;
    seen.add(lower);
    emails.push(lower);
  }
  return { emails, invalid };
}
