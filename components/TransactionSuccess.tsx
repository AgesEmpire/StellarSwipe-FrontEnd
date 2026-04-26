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
    console.log("Navigate to portfolio");
  }, [clearSuccess]);

  const handleContinueSwiping = useCallback(() => clearSuccess(), [clearSuccess]);

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
          <motion.div
            className="absolute inset-0 bg-overlay/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={clearSuccess}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tx-success-title"
            className="relative w-full max-w-md rounded-2xl border border-accent-success/20 bg-gradient-to-b from-surface to-background p-6 shadow-2xl"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <button
              onClick={clearSuccess}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1 text-foreground-subtle transition-colors hover:bg-surface-high hover:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="mb-4 flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              >
                <div className="relative">
                  <motion.div
                    className="absolute -inset-2 rounded-full bg-accent-success/20 blur-xl"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <CheckCircle className="relative h-14 w-14 text-accent-success" />
                </div>
              </motion.div>
            </div>

            <motion.h2
              id="tx-success-title"
              className="mb-1 text-center text-xl font-semibold text-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Trade Executed
            </motion.h2>
            <motion.p
              className="mb-6 text-center text-sm text-foreground-muted"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              Your swap completed successfully
            </motion.p>

            <motion.div
              className="mb-6 space-y-3 rounded-xl bg-surface-high p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <DetailRow label="Token" value={success.token} />
              <DetailRow label="Amount" value={success.amount} />
              <DetailRow label="Price" value={success.price} />
              <DetailRow label="Fee" value={success.fee} />
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-foreground-subtle">Transaction</span>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${success.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-mono text-accent-success transition-colors hover:opacity-80"
                >
                  {truncatedHash}
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </motion.div>

            <motion.div
              className="flex flex-col gap-2 sm:flex-row"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Button
                onClick={handleViewPortfolio}
                className="flex-1 gap-2 bg-accent-success text-foreground hover:opacity-90"
              >
                <Eye className="h-4 w-4" />
                View Portfolio
              </Button>
              <Button
                onClick={handleContinueSwiping}
                variant="outline"
                className="flex-1 gap-2"
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
      <span className="text-xs text-foreground-subtle">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
