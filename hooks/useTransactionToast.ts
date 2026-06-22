"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import type { TransactionError } from "@/components/TransactionFailure";

export type TransactionState = "idle" | "pending" | "success" | "failure";

export interface UseTransactionToastOptions {
  onSuccess?: () => void;
  onFailure?: (error: TransactionError) => void;
}

export function useTransactionToast(options: UseTransactionToastOptions = {}) {
  const { onSuccess, onFailure } = options;

  const notifyPending = useCallback(
    (txHash?: string) => {
      toast.loading("Transaction pending…", {
        id: "tx-status",
        description: txHash
          ? `Waiting for confirmation: ${txHash.slice(0, 12)}…`
          : "Waiting for network confirmation…",
        duration: Infinity,
      });
    },
    []
  );

  const notifySuccess = useCallback(
    (txHash?: string, details?: string) => {
      toast.success("Transaction confirmed!", {
        id: "tx-status",
        description: details || (txHash ? `Tx: ${txHash.slice(0, 16)}…` : "Your transaction was confirmed on the Stellar network."),
        duration: 5000,
      });
      onSuccess?.();
    },
    [onSuccess]
  );

  const notifyFailure = useCallback(
    (error: TransactionError) => {
      toast.error(error.message, {
        id: "tx-status",
        description: error.suggestion,
        duration: 8000,
        action: error.retryable
          ? {
              label: "Retry",
              onClick: () => {
                // Consumer handles retry via their own logic
              },
            }
          : undefined,
      });
      onFailure?.(error);
    },
    [onFailure]
  );

  const notifyDismiss = useCallback(() => {
    toast.dismiss("tx-status");
  }, []);

  return {
    notifyPending,
    notifySuccess,
    notifyFailure,
    notifyDismiss,
  };
}
