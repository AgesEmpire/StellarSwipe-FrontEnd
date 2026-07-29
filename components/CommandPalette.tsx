"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  group: string;
  href: string;
  keywords?: string;
}

const COMMANDS: Command[] = [
  { id: "home", label: "Home", group: "Navigate", href: "/" },
  { id: "signals", label: "Signals", group: "Navigate", href: "/app", keywords: "feed" },
  { id: "leaderboard", label: "Leaderboard", group: "Navigate", href: "/leaderboard", keywords: "providers ranking" },
  { id: "performance", label: "Performance Monitoring", group: "Navigate", href: "/performance", keywords: "metrics" },
  { id: "analytics", label: "Analytics", group: "Navigate", href: "/analytics", keywords: "portfolio" },
  { id: "compare", label: "Compare Signals", group: "Navigate", href: "/compare" },
  { id: "backtest", label: "Backtest Simulator", group: "Navigate", href: "/backtest-sim" },
  { id: "tax", label: "Tax Report", group: "Navigate", href: "/tax-report" },
  { id: "referral", label: "Referral", group: "Navigate", href: "/referral" },
  { id: "security", label: "Security", group: "Navigate", href: "/security" },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const router = useRouter();

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords?.toLowerCase().includes(q)
    );
  }, [query]);

  // Global Cmd/Ctrl+K shortcut, from anywhere in the app.
  React.useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Reset transient state whenever the palette opens.
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  // Keep the active index valid as the filtered result set changes.
  React.useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(results.length - 1, 0)));
  }, [results.length]);

  // Keep the highlighted option scrolled into view.
  React.useEffect(() => {
    const activeEl = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function selectCommand(command: Command) {
    setOpen(false);
    router.push(command.href);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (results.length ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (results.length ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const command = results[activeIndex];
      if (command) selectCommand(command);
    }
  }

  const activeId = results[activeIndex] ? `command-option-${results[activeIndex].id}` : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open command palette"
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-border bg-surface-high px-1.5 py-0.5 text-[10px] font-medium text-foreground-subtle sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay fixed inset-0 z-modal bg-black/60 backdrop-blur-sm" />
          <Dialog.Content
            aria-describedby="command-palette-desc"
            className="dialog-content fixed left-1/2 top-[15%] z-modal w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-background shadow-elevation-3 outline-none"
          >
            <Dialog.Title className="sr-only">Command palette</Dialog.Title>
            <p id="command-palette-desc" className="sr-only">
              Type to search for a page, then use the arrow keys and Enter to navigate.
            </p>

            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search for a page or action…"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-subtle"
                role="combobox"
                aria-expanded="true"
                aria-controls="command-palette-listbox"
                aria-autocomplete="list"
                aria-activedescendant={activeId}
                autoFocus
              />
            </div>

            <div aria-live="polite" className="sr-only">
              {results.length} {results.length === 1 ? "result" : "results"} available
            </div>

            {results.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-foreground-muted" role="status">
                No commands found for “{query}”.
              </p>
            ) : (
              <ul
                ref={listRef}
                id="command-palette-listbox"
                role="listbox"
                aria-label="Commands"
                className="max-h-80 overflow-y-auto p-2"
              >
                {results.map((command, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <li
                      key={command.id}
                      id={`command-option-${command.id}`}
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectCommand(command)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm",
                        isActive ? "bg-accent-primary/10 text-foreground" : "text-foreground-muted"
                      )}
                    >
                      <span>{command.label}</span>
                      {isActive && (
                        <CornerDownLeft className="h-3.5 w-3.5 text-foreground-subtle" aria-hidden="true" />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/store/useThemeStore";
import { EmptyState } from "@/components/ui/empty-state";

interface CommandItem {
  id: string;
  label: string;
  group: "Routes" | "Actions";
  href?: string;
  onSelect?: () => void;
  keywords?: string[];
}

function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onConnectWallet?: () => void;
}

export function CommandPalette({
  open,
  onClose,
  onConnectWallet,
}: CommandPaletteProps) {
  const router = useRouter();
  const { toggle: toggleTheme } = useThemeStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const items: CommandItem[] = [
    { id: "home", label: "Home", group: "Routes", href: "/" },
    { id: "signals", label: "Signals", group: "Routes", href: "/signals" },
    {
      id: "bookmarks",
      label: "Bookmarks",
      group: "Routes",
      href: "/bookmarks",
    },
    {
      id: "providers",
      label: "Providers",
      group: "Routes",
      href: "/providers",
    },
    {
      id: "tax-report",
      label: "Tax Report",
      group: "Routes",
      href: "/tax-report",
      keywords: ["tax", "report"],
    },
    { id: "compare", label: "Compare", group: "Routes", href: "/compare" },
    {
      id: "backtest",
      label: "Backtest Simulator",
      group: "Routes",
      href: "/backtest-sim",
      keywords: ["backtest", "sim"],
    },
    { id: "referral", label: "Referral", group: "Routes", href: "/referral" },
    { id: "security", label: "Security", group: "Routes", href: "/security" },
    {
      id: "analytics",
      label: "Analytics",
      group: "Routes",
      href: "/analytics",
    },
    {
      id: "performance",
      label: "Performance",
      group: "Routes",
      href: "/performance",
    },
    {
      id: "toggle-theme",
      label: "Toggle Theme",
      group: "Actions",
      onSelect: toggleTheme,
      keywords: ["dark", "light", "theme", "mode"],
    },
    {
      id: "connect-wallet",
      label: "Connect Wallet",
      group: "Actions",
      onSelect: onConnectWallet,
      keywords: ["wallet", "freighter", "stellar", "connect"],
    },
  ];

  const filtered = items.filter(
    (item) =>
      fuzzyMatch(query, item.label) ||
      item.keywords?.some((k) => fuzzyMatch(query, k))
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      onClose();
      if (item.href) {
        router.push(item.href);
      } else {
        item.onSelect?.();
      }
    },
    [onClose, router]
  );

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const container = dialogRef.current;
        if (!container) return;
        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>(
            "input, button, [href], [tabindex]:not([tabindex='-1'])"
          )
        ).filter((el) => !el.hasAttribute("disabled"));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (e.shiftKey) {
          if (active === first || !container.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !container.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[activeIndex];
        if (item) handleSelect(item);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, filtered, activeIndex, handleSelect]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[18vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg mx-4 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search
            size={15}
            className="shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search routes and actions…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none rounded focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Search command palette"
            aria-autocomplete="list"
            aria-controls="command-palette-list"
            aria-activedescendant={
              filtered[activeIndex]
                ? `cmd-${filtered[activeIndex].id}`
                : undefined
            }
          />
          <button
            onClick={onClose}
            aria-label="Close command palette"
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={14} />
          </button>
        </div>

        <ul
          id="command-palette-list"
          role="listbox"
          className="max-h-72 overflow-y-auto p-1"
        >
          {filtered.length === 0 ? (
            <li className="px-2 py-2">
              <EmptyState
                title="No results"
                description={`No results for "${query}"`}
                className="rounded-xl bg-transparent py-8"
              />
            </li>
          ) : (
            filtered.map((item, i) => (
              <li
                key={item.id}
                id={`cmd-${item.id}`}
                role="option"
                aria-selected={i === activeIndex}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  i === activeIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent/50"
                )}
              >
                <span
                  className="w-4 text-center text-muted-foreground text-xs"
                  aria-hidden="true"
                >
                  {item.group === "Routes" ? "→" : "⚡"}
                </span>
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {item.group}
                </span>
              </li>
            ))
          )}
        </ul>

        <div className="border-t border-border px-4 py-2 flex gap-4 text-[11px] text-muted-foreground">
          <span>
            <kbd className="font-mono">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="font-mono">↵</kbd> select
          </span>
          <span>
            <kbd className="font-mono">Esc</kbd> close
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
