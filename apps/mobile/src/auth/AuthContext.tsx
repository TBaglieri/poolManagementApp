import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, getEffectiveDataMode } from "../lib/supabase";

interface AuthState {
  session: Session | null;
  loading: boolean;
  /** True when signed in OR running in demo mode (no backend). */
  isAuthenticated: boolean;
  demo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  continueAsDemo: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabaseMode = getEffectiveDataMode() === "supabase";

  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      // No backend configured — allow demo exploration.
      setLoading(false);
      return;
    }
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(() => ({
    session,
    loading,
    demo,
    isAuthenticated: Boolean(session) || demo,
    signIn: async (email, password) => {
      const client = getSupabase();
      if (!client) { setDemo(true); return { error: null }; }
      const { error } = await client.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    signUp: async (email, password) => {
      const client = getSupabase();
      if (!client) { setDemo(true); return { error: null }; }
      const { error } = await client.auth.signUp({ email, password });
      return { error: error?.message ?? null };
    },
    signOut: async () => {
      setDemo(false);
      const client = getSupabase();
      if (client) await client.auth.signOut();
      setSession(null);
    },
    continueAsDemo: () => setDemo(true),
  }), [session, loading, demo]);

  // Expose whether we're in real supabase mode for screens that adapt copy.
  (value as AuthState & { supabaseMode: boolean }).supabaseMode = supabaseMode;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
