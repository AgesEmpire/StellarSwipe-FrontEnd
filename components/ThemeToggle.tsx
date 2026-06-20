"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/store/useThemeStore";
import { useEffect } from "react";

/**
 * Applies the active theme class to <html> and renders a toggle button.
 * Mount once (inside Navbar or layout) — it handles DOM sync automatically.
 */
export function ThemeToggle() {
  const { theme, isHydrated, toggle } = useThemeStore();

  // Sync theme class on <html> whenever it changes
  useEffect(() => {
    if (!isHydrated) return;

    const root = document.documentElement;
    if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  }, [isHydrated, theme]);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!isHydrated}
      aria-pressed={isHydrated ? theme === "dark" : undefined}
      aria-label={
        isHydrated ? `Switch to ${nextTheme} mode` : "Loading theme preference"
      }
      title={isHydrated ? `Switch to ${nextTheme} mode` : "Loading theme preference"}
      className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-high/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-foreground-muted"
    >
      {!isHydrated ? (
        <span className="h-4 w-4 rounded-full bg-current/30" aria-hidden="true" />
      ) : theme === "dark" ? (
        <Sun size={16} aria-hidden="true" />
      ) : (
        <Moon size={16} aria-hidden="true" />
      )}
    </button>
  );
}
