"use client";

/**
 * Supabase Auth wrapper (web).
 *
 * Real email/password auth when in supabase mode and configured; otherwise a
 * no-op so the demo role switcher keeps working in mock mode. Never imports the
 * service-role/admin client — browser-safe anon key only.
 */
import { useEffect, useState } from "react";
import { getBrowserSupabase, getEffectiveDataMode } from "@poolops/supabase";

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthResult {
  ok: boolean;
  user: AuthUser | null;
  /** True when sign-up succeeded but email confirmation is required. */
  needsConfirmation?: boolean;
  error: string | null;
}

export function authEnabled(): boolean {
  return getEffectiveDataMode() === "supabase" && !!getBrowserSupabase();
}

export async function signUp(email: string, password: string, meta?: Record<string, unknown>): Promise<AuthResult> {
  const client = getBrowserSupabase();
  if (!client) return { ok: false, user: null, error: "Supabase auth is not configured (mock mode)." };
  const { data, error } = await client.auth.signUp({ email, password, options: { data: meta } });
  if (error) return { ok: false, user: null, error: error.message };
  const user = data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  const needsConfirmation = !data.session; // no session => email confirmation required
  return { ok: true, user, needsConfirmation, error: null };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const client = getBrowserSupabase();
  if (!client) return { ok: false, user: null, error: "Supabase auth is not configured (mock mode)." };
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, user: null, error: error.message };
  return { ok: true, user: data.user ? { id: data.user.id, email: data.user.email ?? null } : null, error: null };
}

export async function signOut(): Promise<void> {
  const client = getBrowserSupabase();
  if (client) await client.auth.signOut();
}

/** Send a Supabase password-recovery email. Always resolves ok (neutral response);
 *  delivery depends on the project's SMTP being configured. `redirectTo` is where the
 *  emailed link lands (must be registered in Supabase Auth → Redirect URLs). */
export async function sendPasswordReset(email: string, redirectTo: string): Promise<{ ok: boolean; error: string | null }> {
  const client = getBrowserSupabase();
  if (!client) return { ok: false, error: "Password reset isn't available (mock mode)." };
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  return { ok: !error, error: error?.message ?? null };
}

/** True if a Supabase session is present (e.g. the recovery link established one). */
export async function hasSession(): Promise<boolean> {
  const client = getBrowserSupabase();
  if (!client) return false;
  const { data } = await client.auth.getSession();
  return !!data.session;
}

/** Verify the current password by re-authenticating (updateUser never checks it). */
export async function reauthenticate(email: string, currentPassword: string): Promise<{ ok: boolean; error: string | null }> {
  const res = await signIn(email, currentPassword);
  return { ok: res.ok, error: res.ok ? null : "Your current password is incorrect." };
}

/** Set a new password for the CURRENT session's user (Supabase enforces own-account
 *  only — the anon client with a user's JWT can only update that user). */
export async function updatePassword(newPassword: string): Promise<{ ok: boolean; error: string | null }> {
  const client = getBrowserSupabase();
  if (!client) return { ok: false, error: "Not available (mock mode)." };
  const { error } = await client.auth.updateUser({ password: newPassword });
  return { ok: !error, error: error?.message ?? null };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const client = getBrowserSupabase();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}

/** React hook: current Supabase auth user (null in mock mode or signed out). */
export function useAuthUser(): { user: AuthUser | null; loading: boolean } {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getBrowserSupabase();
    if (!client) { setLoading(false); return; }
    let active = true;
    client.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ? { id: data.user.id, email: data.user.email ?? null } : null);
      setLoading(false);
    });
    const { data: sub } = client.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return { user, loading };
}
