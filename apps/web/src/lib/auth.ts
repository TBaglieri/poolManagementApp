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
