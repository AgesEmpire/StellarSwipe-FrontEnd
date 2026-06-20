"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/store/useThemeStore";
import { applyThemeToDocument } from "@/lib/theme";
import { useEffect } from "react";

/**
 * Applies the active theme class to <html> and renders a toggle button.
 * Mount once (inside Navbar or layout) — it handles DOM sync automatically.
 */
export function ThemeToggle() {
  const { theme, toggle } = useThemeStore();

  // Sync theme class on <html> whenever it changes
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === "dark"}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-high/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {theme === "dark" ? (
        <Sun size={16} aria-hidden="true" />
      ) : (
        <Moon size={16} aria-hidden="true" />
      )}
    </button>
  );
}
