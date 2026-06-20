"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createPersistedState,
  type PersistHydrationState,
  withPersistedHydration,
} from "./persistHydration";

type Theme = "dark" | "light";

interface ThemeState extends PersistHydrationState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      ...createPersistedState<ThemeState>(set),
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggle: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
    }),
    withPersistedHydration({
      name: "stellar-theme",
      storage: createJSONStorage(() => localStorage),
    })
  )
);
