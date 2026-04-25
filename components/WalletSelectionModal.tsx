"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, Loader2, ExternalLink } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

interface WalletSelectionModalProps {
  open: boolean;
  onClose: () => void;
}

interface WalletOption {
  id: string;
  name: string;
  description: string;
  installUrl: string;
}

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: "freighter",
    name: "Freighter",
    description:
      "The official browser extension wallet for the Stellar network, built by the Stellar Development Foundation.",
    installUrl: "https://www.freighter.app",
  },
];

export function WalletSelectionModal({ open, onClose }: WalletSelectionModalProps) {
  const { connect, isConnecting } = useWallet();
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Reset selection when modal closes
  useEffect(() => {
    if (!open) setSelectedWallet(null);
  }, [open]);

  async function handleSelectWallet(walletId: string) {
    if (isConnecting) return;
    setSelectedWallet(walletId);
    await connect();
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Connect Wallet"
            className="relative z-10 w-full max-w-sm rounded-2xl border border-gray-700/60 bg-gray-900/95 p-6 shadow-2xl"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-white">Connect Wallet</h2>
              <button
                onClick={onClose}
                aria-label="Close wallet selection"
                className="rounded-full p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-5">
              Choose a wallet to connect to StellarSwipe
            </p>

            {/* Wallet options */}
            <div className="space-y-3">
              {WALLET_OPTIONS.map((wallet) => {
                const isSelected = selectedWallet === wallet.id;
                const loading = isSelected && isConnecting;

                return (
                  <button
                    key={wallet.id}
                    onClick={() => handleSelectWallet(wallet.id)}
                    disabled={isConnecting}
                    className="w-full flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:border-blue-500/50 hover:bg-white/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed"
                  >
                    {/* Icon */}
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/30">
                      {loading ? (
                        <Loader2 size={20} className="text-blue-400 animate-spin" />
                      ) : (
                        <Wallet size={20} className="text-blue-400" />
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{wallet.name}</p>
                      <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">
                        {wallet.description}
                      </p>
                      {loading && (
                        <p className="mt-1.5 text-xs text-blue-400">Connecting…</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <p className="mt-5 text-center text-xs text-gray-500">
              Don&apos;t have a wallet?{" "}
              <a
                href="https://www.freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 underline-offset-2 hover:underline"
              >
                Install Freighter <ExternalLink size={11} />
              </a>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
