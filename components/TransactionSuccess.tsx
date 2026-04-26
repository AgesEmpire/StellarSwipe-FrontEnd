"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ArrowRight, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransactionStore } from "@/store/useTransactionStore";

const AUTO_DISMISS_MS = 8000;

export function TransactionSuccess() {
  const { success, showSuccess, clearSuccess } = useTransactionStore();

  const handleViewPortfolio = useCallback(() => {
    clearSuccess();
    // Navigate to portfolio - placeholder for now
    console.log("Navigate to portfolio");
  }, [clearSuccess]);

  const handleContinueSwiping = useCallback(() => {
    clearSuccess();
  }, [clearSuccess]);

  // Auto-dismiss
  useEffect(() => {
    if (!showSuccess) return;
    const timer = setTimeout(clearSuccess, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [showSuccess, clearSuccess]);

  if (!success) return null;

  const truncatedHash = `${success.hash.slice(0, 8)}...${success.hash.slice(-6)}`;

  return (
    <AnimatePresence>
      {showSuccess && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={clearSuccess}
          />

          {/* Card */}
          <motion.div
            className="relative w-full max-w-md rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-2xl shadow-emerald-500/10 sm:p-6"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Close button */}
            <button
              onClick={clearSuccess}
              className="absolute right-4 top-4 rounded-full p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Success animation */}
            <div className="mb-4 flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.1,
                }}
              >
                <div className="relative">
                  {/* Glow ring */}
                  <motion.div
                    className="absolute -inset-2 rounded-full bg-emerald-500/20 blur-xl"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <CheckCircle className="relative h-14 w-14 text-emerald-400" />
                </div>
              </motion.div>
            </div>

            {/* Title */}
            <motion.h2
              className="mb-1 text-center text-xl font-semibold text-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Trade Executed
            </motion.h2>
            <motion.p
              className="mb-6 text-center text-sm text-zinc-400"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              Your swap completed successfully
            </motion.p>

            {/* Transaction details */}
            <motion.div
              className="mb-6 space-y-3 rounded-xl bg-zinc-800/50 p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <DetailRow label="Token" value={success.token} />
              <DetailRow label="Amount" value={success.amount} />
              <DetailRow label="Price" value={success.price} />
              <DetailRow label="Fee" value={success.fee} />
              <div className="flex items-center justify-between border-t border-zinc-700/50 pt-3">
                <span className="text-xs text-zinc-500">Transaction</span>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${success.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-mono text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  {truncatedHash}
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div
              className="flex flex-col gap-2 sm:flex-row"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Button
                onClick={handleViewPortfolio}
                className="flex-1 gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
              >
                <Eye className="h-4 w-4" />
                View Portfolio
              </Button>
              <Button
                onClick={handleContinueSwiping}
                variant="outline"
                className="flex-1 gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Continue Swiping
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-zinc-200">{value}</span>
    </div>
  );
}
