"use client";

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

export function CommandPalette({ open, onClose, onConnectWallet }: CommandPaletteProps) {
  const router = useRouter();
  const { toggle: toggleTheme } = useThemeStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const items: CommandItem[] = [
    { id: "home", label: "Home", group: "Routes", href: "/" },
    { id: "signals", label: "Signals", group: "Routes", href: "/signals" },
    { id: "bookmarks", label: "Bookmarks", group: "Routes", href: "/bookmarks" },
    { id: "providers", label: "Providers", group: "Routes", href: "/providers" },
    { id: "tax-report", label: "Tax Report", group: "Routes", href: "/tax-report", keywords: ["tax", "report"] },
    { id: "compare", label: "Compare", group: "Routes", href: "/compare" },
    { id: "backtest", label: "Backtest Simulator", group: "Routes", href: "/backtest-sim", keywords: ["backtest", "sim"] },
    { id: "referral", label: "Referral", group: "Routes", href: "/referral" },
    { id: "security", label: "Security", group: "Routes", href: "/security" },
    { id: "analytics", label: "Analytics", group: "Routes", href: "/analytics" },
    { id: "performance", label: "Performance", group: "Routes", href: "/performance" },
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

  useEffect(() => { setActiveIndex(0); }, [query]);

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
      if (e.key === "Escape") { onClose(); return; }
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
      <div className="relative w-full max-w-lg mx-4 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search routes and actions…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            aria-label="Search command palette"
            aria-autocomplete="list"
            aria-controls="command-palette-list"
            aria-activedescendant={filtered[activeIndex] ? `cmd-${filtered[activeIndex].id}` : undefined}
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
                <span className="w-4 text-center text-muted-foreground text-xs" aria-hidden="true">
                  {item.group === "Routes" ? "→" : "⚡"}
                </span>
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] text-muted-foreground">{item.group}</span>
              </li>
            ))
          )}
        </ul>

        <div className="border-t border-border px-4 py-2 flex gap-4 text-[11px] text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
