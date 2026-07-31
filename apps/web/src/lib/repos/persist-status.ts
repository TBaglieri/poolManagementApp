"use client";

/**
 * Persistence-error surface. Every WRITE that fails against Supabase reports here so
 * failures stop being silent (the #1 reason "Save" seemed to do nothing / data
 * vanished on refresh). A toast in the shell shows these, and the console logs them
 * with the exact Postgres message (e.g. a missing column or a not-null on
 * organization_id → "run the SQL"). Read-fallbacks to mock data are NOT reported —
 * only real write failures.
 */
import { create } from "zustand";

export interface PersistError {
  id: string;
  table: string;
  op: "insert" | "update" | "delete";
  message: string;
  at: number;
}

interface PersistStatusState {
  errors: PersistError[];
  report: (e: Omit<PersistError, "id" | "at">) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const usePersistStatus = create<PersistStatusState>((set) => ({
  errors: [],
  report: (e) =>
    set((s) => ({
      // Keep the most recent few; de-dupe identical table+op+message bursts.
      errors: [
        { ...e, id: Math.random().toString(36).slice(2), at: Date.now() },
        ...s.errors.filter((x) => !(x.table === e.table && x.op === e.op && x.message === e.message)),
      ].slice(0, 6),
    })),
  dismiss: (id) => set((s) => ({ errors: s.errors.filter((x) => x.id !== id) })),
  clear: () => set({ errors: [] }),
}));

/** Called by the db helpers when a write fails. Never throws. */
export function reportPersistError(table: string, op: PersistError["op"], message: string): void {
  try { usePersistStatus.getState().report({ table, op, message }); } catch { /* no-op */ }
  if (typeof console !== "undefined") console.error(`[persist] ${op} ${table} failed → ${message}`);
}
