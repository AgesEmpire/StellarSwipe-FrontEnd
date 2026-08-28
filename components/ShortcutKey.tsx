"use client";

import { cn } from "@/lib/utils";

interface ShortcutKeyProps {
  /** The shortcut key(s) to display, e.g. "⌘K", "? ", "G then N", "Esc" */
  keys: string;
  /** Optional size variant */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const KEY_MAP: Record<string, string> = {
  meta: "⌘",
  command: "⌘",
  ctrl: "Ctrl",
  control: "Ctrl",
  shift: "⇧",
  alt: "⌥",
  option: "⌥",
  escape: "Esc",
  enter: "↵",
  return: "↵",
  tab: "Tab",
  backspace: "⌫",
  delete: "Del",
  space: "Space",
  " ": "Space",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

function normalizeKey(key: string): string {
  const lower = key.toLowerCase().trim();
  return KEY_MAP[lower] ?? key;
}

function parseShortcut(keys: string): string[] {
  // Handle "g then n" style
  if (keys.toLowerCase().includes(" then ")) {
    return keys.split(" then ").map((k) => normalizeKey(k.trim()));
  }

  // Handle "Arrow Up / Arrow Down" style
  if (keys.includes(" / ")) {
    const parts = keys.split(" / ");
    return [parts[0], ...parts.slice(1)];
  }

  // Handle modifier combos like "Ctrl+K"
  const parts = keys.split("+").map((k) => normalizeKey(k.trim()));
  return parts;
}

export function ShortcutKey({ keys, size = "md", className }: ShortcutKeyProps) {
  const parts = parseShortcut(keys);

  const sizeStyles = {
    sm: "h-4 min-w-[18px] px-1 text-[9px] leading-none rounded-[3px]",
    md: "h-5 min-w-[22px] px-1.5 text-[10px] leading-none rounded-[3px]",
    lg: "h-6 min-w-[26px] px-2 text-xs leading-none rounded-[4px]",
  };

  // Check if this is a " / " separated set (which we render as-is)
  const isComposite = keys.includes(" / ");

  if (isComposite) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 font-mono tracking-wide text-foreground-muted",
          className
        )}
        aria-label={`Keyboard shortcut: ${keys}`}
      >
        {parts.map((part, i) => (
          <span key={i}>
            <span
              className={cn(
                "inline-flex items-center justify-center border border-border bg-accent/50 font-semibold text-foreground shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]",
                sizeStyles[size]
              )}
            >
              {part}
            </span>
            {i < parts.length - 1 && (
              <span className="mx-0.5 text-[10px] text-foreground-muted" aria-hidden="true">
                /
              </span>
            )}
          </span>
        ))}
      </span>
    );
  }

  // "g then n" style
  if (keys.toLowerCase().includes(" then ")) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 font-mono tracking-wide",
          className
        )}
        aria-label={`Keyboard shortcut: ${keys}`}
      >
        {parts.map((part, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            {i > 0 && (
              <span className="text-[10px] text-foreground-muted" aria-hidden="true">
                then
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center justify-center border border-border bg-accent/50 font-semibold text-foreground shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]",
                sizeStyles[size]
              )}
            >
              {part}
            </span>
          </span>
        ))}
      </span>
    );
  }

  // Simple key or modifier+key combo
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono",
        className
      )}
      aria-label={`Keyboard shortcut: ${keys}`}
    >
      {parts.map((part, i) => (
        <span key={i} className="inline-flex items-center gap-0.5">
          {i > 0 && (
            <span className="text-[9px] text-foreground-muted" aria-hidden="true">
              +
            </span>
          )}
          <kbd
            className={cn(
              "inline-flex items-center justify-center border border-border bg-accent/50 font-semibold text-foreground shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]",
              sizeStyles[size]
            )}
          >
            {part}
          </kbd>
        </span>
      ))}
    </span>
  );
}
