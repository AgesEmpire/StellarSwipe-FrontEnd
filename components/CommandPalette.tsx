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
  );
}
