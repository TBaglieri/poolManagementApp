"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** null = follow the tenant's default scheme. */
export type SchemePref = "light" | "dark" | "system" | null;

interface ThemeSchemeState {
  scheme: SchemePref;
  hydrated: boolean;
  setScheme: (scheme: SchemePref) => void;
  _setHydrated: () => void;
}

export const useThemeScheme = create<ThemeSchemeState>()(
  persist(
    (set) => ({
      scheme: null,
      hydrated: false,
      setScheme: (scheme) => set({ scheme }),
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "poolops-scheme",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ scheme: s.scheme }),
      onRehydrateStorage: () => (state) => state?._setHydrated(),
    },
  ),
);
