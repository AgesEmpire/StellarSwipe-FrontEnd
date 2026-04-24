"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransactionStore } from "@/store/useTransactionStore";

interface TransactionFailureProps {
  onRetry?: (preservedInput: Record<string, unknown> | null) => void;
}

export function TransactionFailure({ onRetry }: TransactionFailureProps) {
  const { error, showError, clearError, preservedInput, setPreservedInput } =
    useTransactionStore();

  const handleRetry = useCallback(() => {
    const input = preservedInput;
    clearError();
    // Clear preserved input after passing it to the retry handler
    setPreservedInput(null);
    onRetry?.(input);
  }, [clearError, preservedInput, setPreservedInput, onRetry]);

  const handleDismiss = useCallback(() => {
    clearError();
    setPreservedInput(null);
  }, [clearError, setPreservedInput]);

  if (!error) return null;

  return (
    <AnimatePresence>
      {showError && (
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
            onClick={handleDismiss}
          />

          {/* Card */}
          <motion.div
            className="relative w-full max-w-md rounded-2xl border border-red-500/20 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 shadow-2xl shadow-red-500/10"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute right-4 top-4 rounded-full p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Failure animation */}
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
                    className="absolute -inset-2 rounded-full bg-red-500/20 blur-xl"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {/* Shake animation on the icon */}
                  <motion.div
                    animate={{ rotate: [0, -8, 8, -8, 0] }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <AlertTriangle className="relative h-14 w-14 text-red-400" />
                  </motion.div>
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
              Transaction Failed
            </motion.h2>
            <motion.p
              className="mb-6 text-center text-sm text-zinc-400"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              {error.message || "Something went wrong during the trade execution."}
            </motion.p>

            {/* Error details */}
            {(error.reason || error.code) && (
              <motion.div
                className="mb-6 space-y-2 rounded-xl bg-red-950/30 border border-red-500/10 p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {error.code && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Error Code</span>
                    <span className="text-xs font-mono text-red-300">{error.code}</span>
                  </div>
                )}
                {error.reason && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs text-zinc-500 shrink-0">Reason</span>
                    <span className="text-xs text-right text-zinc-300">{error.reason}</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              className="flex flex-col gap-2 sm:flex-row"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Button
                onClick={handleRetry}
                className="flex-1 gap-2 bg-red-600 text-white hover:bg-red-500"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                className="flex-1 gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Dismiss
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
