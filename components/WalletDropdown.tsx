"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { usePortfolio } from "@/hooks/usePortfolio";
import { Button } from "@/components/ui/button";
import {
  Check,
  ChevronDown,
  Copy,
  LogOut,
  PlusCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

function truncate(key: string) {
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export function WalletDropdown() {
  const {
    publicKey,
    wallets,
    activePublicKey,
    switchWallet,
    connectAnother,
    disconnect,
    disconnectAll,
    isConnecting,
  } = useWallet();
  const { refetch } = usePortfolio();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  const truncated = publicKey ? truncate(publicKey) : "";

  const handleCopy = useCallback(async () => {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [publicKey]);

  function handleClose() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshed(false);
    try {
      await refetch();
      setRefreshed(true);
      setTimeout(() => setRefreshed(false), 2500);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refetch]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) handleClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        const menu = menuRef.current;
        if (!menu) return;
        const items = Array.from(
          menu.querySelectorAll<HTMLElement>('[role="menuitem"]')
        );
        if (!items.length) return;
        const idx = items.indexOf(document.activeElement as HTMLElement);
        const next =
          e.key === "ArrowDown"
            ? idx < 0
              ? 0
              : (idx + 1) % items.length
            : idx < 0
            ? items.length - 1
            : (idx - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        ref={triggerRef}
        variant="outline"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={publicKey ? `Wallet menu for ${truncated}` : "Wallet menu"}
        className="font-mono gap-2"
      >
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <span className="hidden xs:inline">{truncated}</span>
        {wallets.length > 1 && (
          <span className="rounded-full bg-blue-500/20 px-1.5 text-[10px] text-blue-400 font-semibold">
            {wallets.length}
          </span>
        )}
        <ChevronDown
          aria-hidden="true"
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </Button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Wallet options"
          className="absolute end-0 mt-2 w-80 rounded-xl border bg-popover shadow-lg p-2 flex flex-col gap-1 z-50"
        >
          {/* Connected wallets list */}
          {wallets.length > 0 && (
            <div className="px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Connected wallets
              </p>
              <ul className="flex flex-col gap-1" role="list">
                {wallets.map((w) => {
                  const isActive = w.publicKey === activePublicKey;
                  return (
                    <li key={w.publicKey}>
                      <button
                        role="menuitem"
                        tabIndex={0}
                        onClick={() => {
                          if (!isActive) switchWallet(w.publicKey);
                        }}
                        aria-label={
                          isActive
                            ? `Active wallet: ${truncate(w.publicKey)}`
                            : `Switch to wallet: ${truncate(w.publicKey)}`
                        }
                        className={cn(
                          "w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isActive
                            ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                            : "hover:bg-accent text-muted-foreground"
                        )}
                      >
                        <span>{truncate(w.publicKey)}</span>
                        {isActive && (
                          <Check
                            className="h-3 w-3 text-blue-400"
                            aria-label="Active"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <hr className="border-border" />

          {/* Add another wallet */}
          <button
            role="menuitem"
            tabIndex={0}
            onClick={() => {
              handleClose();
              connectAnother();
            }}
            disabled={isConnecting}
            aria-label="Connect another wallet"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-60"
          >
            <PlusCircle className="h-4 w-4 text-blue-400" aria-hidden="true" />
            Connect another wallet
          </button>

          <hr className="border-border" />

          {/* Full active address */}
          <p className="px-3 py-2 text-xs font-mono text-muted-foreground break-all select-all">
            {publicKey}
          </p>

          {/* Refresh balance */}
          <button
            role="menuitem"
            tabIndex={0}
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label={
              isRefreshing
                ? "Refreshing wallet balance…"
                : refreshed
                ? "Balance refreshed"
                : "Refresh wallet balance"
            }
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshed ? (
              <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
            ) : (
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  isRefreshing && "animate-spin text-blue-400"
                )}
                aria-hidden="true"
              />
            )}
            <span aria-live="polite">
              {isRefreshing
                ? "Refreshing…"
                : refreshed
                ? "Balance updated"
                : "Refresh balance"}
            </span>
          </button>

          {/* Copy */}
          <button
            role="menuitem"
            tabIndex={0}
            onClick={handleCopy}
            aria-label={copied ? "Address copied" : "Copy wallet address"}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            {copied ? (
              <Check aria-hidden="true" className="h-4 w-4 text-green-600" />
            ) : (
              <Copy aria-hidden="true" className="h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy address"}
          </button>

          <hr className="border-border" />

          {/* Disconnect active */}
          <button
            role="menuitem"
            tabIndex={0}
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
            aria-label="Disconnect active wallet"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Disconnect
          </button>

          {/* Disconnect all */}
          {wallets.length > 1 && (
            <button
              role="menuitem"
              tabIndex={0}
              onClick={() => {
                disconnectAll();
                setOpen(false);
              }}
              aria-label="Disconnect all wallets"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive/80 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Disconnect all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
