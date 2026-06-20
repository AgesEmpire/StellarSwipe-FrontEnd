"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getInitialTheme, type Theme } from "@/lib/theme";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: getInitialTheme(),
      setTheme: (theme) => set({ theme }),
      toggle: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
    }),
    {
      name: "stellar-theme",
      getStorage: () => (typeof window !== "undefined" ? localStorage : undefined),
    }
  )
);
