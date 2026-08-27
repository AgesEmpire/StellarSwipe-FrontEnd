"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { WalletDropdown } from "@/components/WalletDropdown";
import { WalletSelectionModal } from "@/components/WalletSelectionModal";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcutsHelpModal } from "@/components/KeyboardShortcutsHelpModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useThemeStore } from "@/store/useThemeStore";
import { useFocusReturn } from "@/hooks/useFocusReturn";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/app", label: "Signals", tourId: "signals" },
  { href: "/journal", label: "Journal" },
  { href: "/bookmarks", label: "Bookmarks" },
  { href: "/compare", label: "Compare", tourId: "compare" },
  { href: "/providers", label: "Providers" },
  { href: "/tax-report", label: "Tax Report" },
  { href: "/preferences", label: "Preferences" },
];

const routeShortcuts: Record<string, string> = {
  "n": "/app",
  "b": "/bookmarks",
  "h": "/",
  "j": "/journal",
  "p": "/providers",
  "t": "/tax-report",
  "c": "/compare",
  "s": "/backtest-sim",
};

export function Navbar() {
  const router = useRouter();
  const { connected, isConnecting, connect } = useWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  // Open command palette on Cmd+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Restore focus to the triggering element when each overlay closes.
  useFocusReturn(walletModalOpen);
  useFocusReturn(paletteOpen);
  useFocusReturn(helpModalOpen);

  const toggleTheme = useThemeStore((state) => state.toggle);

  // Global keyboard shortcuts
  const shortcuts = useMemo(() => [
    {
      key: "?",
      description: "Open keyboard shortcuts overlay",
      category: "Modals" as const,
      handler: () => setHelpModalOpen(true),
    },
    {
      key: "n",
      description: "New journal entry",
      category: "Actions" as const,
      handler: () => router.push("/journal"),
    },
    {
      key: "t",
      description: "Toggle theme",
      category: "Actions" as const,
      handler: () => toggleTheme(),
    },
    {
      key: "r",
      description: "Refresh page",
      category: "Actions" as const,
      handler: () => router.refresh(),
    },
    // Sequential navigation shortcuts: G then [key]
    ...Object.entries(routeShortcuts).map(([key, href]) => ({
      key: `g then ${key}`,
      description: `Go to ${NAV_LINKS.find((l) => l.href === href)?.label ?? href}`,
      category: "Navigation" as const,
      handler: () => router.push(href),
    })),
  ], [router, toggleTheme]);

  useKeyboardShortcuts(shortcuts);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md pt-safe">
        <nav
          className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
            aria-label="StellarSwipe home"
          >
            <Zap className="h-5 w-5 text-blue-400" aria-hidden="true" />
            <span className="text-sm sm:text-base">StellarSwipe</span>
          </Link>

          {/* Nav links */}
          <ul className="hidden sm:flex items-center gap-1" role="list">
            {NAV_LINKS.map(({ href, label, tourId }) => (
              <li key={href}>
                <Link
                  href={href}
                  data-tour={tourId}
                  className="rounded-md px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground hover:bg-surface-high/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Help/shortcuts button */}
            <button
              onClick={() => setHelpModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-foreground-muted hover:text-foreground hover:bg-surface-high/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 group"
              aria-label="Keyboard shortcuts (?)"
              title="Keyboard shortcuts (?)"
            >
              <kbd className="inline-flex h-4 min-w-[18px] items-center justify-center rounded-[3px] border border-border bg-accent/50 px-1 text-[9px] font-semibold text-foreground shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">
                ?
              </kbd>
              <span className="sr-only sm:not-sr-only">Shortcuts</span>
            </button>

            <ThemeToggle />
            <LanguageSelector />
            <div data-tour="wallet" className="inline-flex">
              {connected ? (
                <WalletDropdown />
              ) : (
                <Button
                  size="sm"
                  disabled={isConnecting}
                  onClick={() => setWalletModalOpen(true)}
                  aria-label={
                    isConnecting ? "Connecting wallet…" : "Connect wallet"
                  }
                  className="gap-2"
                >
                  {isConnecting && (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {isConnecting ? "Connecting…" : "Connect Wallet"}
                </Button>
              )}
            </div>
          </div>
        </nav>
      </header>

      <WalletSelectionModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onConnectWallet={() => {
          if (connected) return;
          setWalletModalOpen(true);
        }}
      />

      <KeyboardShortcutsHelpModal
        open={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />
    </>
  );
}
