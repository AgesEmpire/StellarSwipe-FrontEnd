"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Check, Copy, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function WalletDropdown() {
  const { publicKey, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const truncated = publicKey
    ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}`
    : "";

  const handleCopy = useCallback(async () => {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [publicKey]);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="font-mono gap-2"
      >
        {truncated}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-xl border bg-popover shadow-lg p-2 flex flex-col gap-1 z-dropdown"
        >
          {/* Full address */}
          <p className="px-3 py-2 text-xs font-mono text-muted-foreground break-all select-all">
            {publicKey}
          </p>

          <hr className="border-border" />

          {/* Copy */}
          <button
            role="menuitem"
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy address"}
          </button>

          {/* Disconnect */}
          <button
            role="menuitem"
            onClick={() => { disconnect(); setOpen(false); }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
