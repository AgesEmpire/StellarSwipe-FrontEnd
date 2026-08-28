"use client";

import { Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { useThemeStore, useThemeHydrated } from "@/store/useThemeStore";
import { ThemeToggle } from "@/components/ThemeToggle";

const SESSION_KEY = "stellar-theme-backup";

function getSystemPreference(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function saveSessionBackup(theme: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, theme);
  } catch {
    // sessionStorage may be unavailable
  }
}

function readSessionBackup(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function ThemePersistence() {
  const { theme } = useThemeStore();
  const isHydrated = useThemeHydrated();
  const [usingSystem, setUsingSystem] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;

    const sessionBackup = readSessionBackup();
    const hasExplicitChoice = localStorage.getItem("stellar-theme");

    if (!hasExplicitChoice && !sessionBackup) {
      setUsingSystem(true);
    } else {
      setUsingSystem(false);
    }

    saveSessionBackup(theme);
  }, [isHydrated, theme]);

  useEffect(() => {
    if (!usingSystem) return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const { setTheme } = useThemeStore.getState();
      setTheme(e.matches ? "dark" : "light");
    };

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [usingSystem]);

  return (
    <div className="relative inline-flex items-center">
      <ThemeToggle />
      {isHydrated && usingSystem && (
        <span
          title="Using your system's color scheme"
          className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-700 ring-1 ring-slate-500"
        >
          <Monitor className="h-2 w-2 text-slate-300" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
