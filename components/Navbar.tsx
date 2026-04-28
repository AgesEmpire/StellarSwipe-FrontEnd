"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Zap } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { WalletDropdown } from "@/components/WalletDropdown";
import { WalletSelectionModal } from "@/components/WalletSelectionModal";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/signals", label: "Signals" },
  { href: "/providers", label: "Providers" },
];

export function Navbar() {
  const { connected, isConnecting } = useWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-gray-950/80 backdrop-blur-md">
        <nav
          className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
            aria-label="StellarSwipe home"
          >
            <Zap className="h-5 w-5 text-blue-400" aria-hidden="true" />
            <span className="text-sm sm:text-base">StellarSwipe</span>
          </Link>

          {/* Nav links */}
          <ul className="hidden sm:flex items-center gap-1" role="list">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="rounded-md px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Wallet CTA */}
          <div className="flex items-center">
            {connected ? (
              <WalletDropdown />
            ) : (
              <Button
                size="sm"
                disabled={isConnecting}
                onClick={() => setWalletModalOpen(true)}
                aria-label={isConnecting ? "Connecting wallet…" : "Connect wallet"}
                className="gap-2"
              >
                {isConnecting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
                {isConnecting ? "Connecting…" : "Connect Wallet"}
              </Button>
            )}
          </div>
        </nav>
      </header>

      <WalletSelectionModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
    </>
  );
}
