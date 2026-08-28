"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

/** Default accent color applied to --color-accent CSS custom property */
export const DEFAULT_ACCENT_COLOR = "#3b82f6";

interface ThemeState {
  theme: Theme;
  accentColor: string;
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
  setAccentColor: (color: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Default to "dark"; the blocking inline script in layout.tsx overrides
      // this at paint time based on the persisted value or system preference.
      theme: "dark",
      accentColor: DEFAULT_ACCENT_COLOR,
      _hasHydrated: false,
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
      setTheme: (theme) => set({ theme }),
      toggle: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setAccentColor: (color) => set({ accentColor: color }),
    }),
    {
      name: "stellar-theme",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/** Returns `true` once localStorage has been read and state is stable. */
export const useThemeHydrated = () => useThemeStore((s) => s._hasHydrated);
