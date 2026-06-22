"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ── Error message mapping for common Stellar transaction failures ──

export interface TransactionError {
  code: string;
  message: string;
  suggestion: string;
  retryable: boolean;
}

const STELLAR_ERROR_MAP: Record<string, TransactionError> = {
  "op_bad_auth": {
    code: "op_bad_auth",
    message: "Transaction authorization failed",
    suggestion: "Check that your wallet has the required permissions and try again.",
    retryable: true,
  },
  "op_underfunded": {
    code: "op_underfunded",
    message: "Insufficient balance",
    suggestion: "Ensure you have enough XLM to cover the transaction amount plus fees (minimum 1 XLM reserve).",
    retryable: false,
  },
  "op_no_trust": {
    code: "op_no_trust",
    message: "Trustline not established",
    suggestion: "You need to establish a trustline for this asset before trading. Add the asset in your wallet first.",
    retryable: false,
  },
  "op_no_issuer": {
    code: "op_no_issuer",
    message: "Asset issuer not found",
    suggestion: "The asset issuer account may have been merged or does not exist. Verify the asset code and issuer.",
    retryable: false,
  },
  "op_too_few_offers": {
    code: "op_too_few_offers",
    message: "Order book too thin",
    suggestion: "There are not enough offers in the order book. Try a smaller amount or a different trading pair.",
    retryable: true,
  },
  "op_over_source_max": {
    code: "op_over_source_max",
    message: "Amount exceeds maximum",
    suggestion: "The amount you entered exceeds the maximum allowed. Reduce the amount and try again.",
    retryable: false,
  },
  "tx_insufficient_fee": {
    code: "tx_insufficient_fee",
    message: "Network fee too low",
    suggestion: "The network is congested. The fee will be automatically adjusted. Please retry.",
    retryable: true,
  },
  "tx_too_late": {
    code: "tx_too_late",
    message: "Transaction expired",
    suggestion: "The transaction time bounds have expired. Please try again with fresh time bounds.",
    retryable: true,
  },
  "tx_bad_seq": {
    code: "tx_bad_seq",
    message: "Sequence number mismatch",
    suggestion: "Your wallet's sequence number is out of sync. Please wait a moment and try again.",
    retryable: true,
  },
  "tx_failed": {
    code: "tx_failed",
    message: "Transaction failed",
    suggestion: "The transaction failed. Check the details below and try again.",
    retryable: true,
  },
  "timeout": {
    code: "timeout",
    message: "Transaction timed out",
    suggestion: "The network did not respond in time. This may be temporary. Please retry.",
    retryable: true,
  },
  "network_error": {
    code: "network_error",
    message: "Network connection error",
    suggestion: "Could not connect to the Stellar network. Check your internet connection and try again.",
    retryable: true,
  },
  "user_rejected": {
    code: "user_rejected",
    message: "Transaction rejected",
    suggestion: "You rejected the transaction in your wallet. Try again when ready.",
    retryable: true,
  },
};

// ── Hook: useTransactionRetry ──

export interface UseTransactionRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number) => void;
  onSuccess?: () => void;
  onError?: (error: TransactionError, attempt: number) => void;
}

export interface UseTransactionRetryReturn {
  attempt: number;
  isRetrying: boolean;
  canRetry: boolean;
  execute: (fn: () => Promise<void>) => Promise<void>;
  reset: () => void;
}

export function useTransactionRetry(
  options: UseTransactionRetryOptions = {}
): UseTransactionRetryReturn {
  const { maxRetries = 3, baseDelayMs = 1000, onRetry, onSuccess, onError } = options;
  const [attempt, setAttempt] = React.useState(0);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const cancelledRef = React.useRef(false);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const execute = React.useCallback(
    async (fn: () => Promise<void>) => {
      cancelledRef.current = false;
      setIsRetrying(true);

      for (let i = 0; i <= maxRetries; i++) {
        if (cancelledRef.current) break;

        setAttempt(i);
        try {
          await fn();
          if (!cancelledRef.current) {
            setIsRetrying(false);
            onSuccess?.();
          }
          return;
        } catch (err) {
          const txError: TransactionError =
            err instanceof Error && "code" in err
              ? mapStellarError((err as Error & { code: string }).code, err.message)
              : mapStellarError("tx_failed", err instanceof Error ? err.message : "Unknown error");

          if (i < maxRetries && txError.retryable && !cancelledRef.current) {
            onRetry?.(i + 1);
            await delay(baseDelayMs * Math.pow(2, i)); // exponential backoff: 1s, 2s, 4s
          } else {
            if (!cancelledRef.current) {
              setIsRetrying(false);
              onError?.(txError, i);
            }
            return;
          }
        }
      }
    },
    [maxRetries, baseDelayMs, onRetry, onSuccess, onError]
  );

  const reset = React.useCallback(() => {
    cancelledRef.current = true;
    setAttempt(0);
    setIsRetrying(false);
  }, []);

  return {
    attempt,
    isRetrying,
    canRetry: attempt < maxRetries,
    execute,
    reset,
  };
}

// ── Error mapping helper ──

export function mapStellarError(code: string, fallbackMessage?: string): TransactionError {
  if (STELLAR_ERROR_MAP[code]) return STELLAR_ERROR_MAP[code];

  // Try partial match
  for (const key of Object.keys(STELLAR_ERROR_MAP)) {
    if (code.includes(key) || key.includes(code)) return STELLAR_ERROR_MAP[key];
  }

  return {
    code: "unknown",
    message: fallbackMessage || "An unexpected error occurred",
    suggestion: "Please try again. If the problem persists, contact support.",
    retryable: true,
  };
}

// ── Component: TransactionFailure ──

export interface TransactionFailureProps {
  error: TransactionError | string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function TransactionFailure({
  error,
  onRetry,
  onDismiss,
  className,
}: TransactionFailureProps) {
  const txError: TransactionError =
    typeof error === "string" ? mapStellarError("tx_failed", error) : error;

  return (
    <div
      className={cn(
        "rounded-xl border border-accent-danger/30 bg-accent-danger/5 p-4",
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-danger/15">
          <AlertTriangle className="h-4 w-4 text-accent-danger" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            {txError.message}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {txError.suggestion}
          </p>
          {txError.code !== "unknown" && (
            <p className="mt-2 text-[10px] font-mono text-muted-foreground/60">
              Error code: {txError.code}
            </p>
          )}
          {txError.retryable && onRetry && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-8 text-xs"
              >
                <RefreshCw className="mr-1.5 h-3 w-3" aria-hidden="true" />
                Try Again
              </Button>
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Component: TransactionRetryButton ──

export interface TransactionRetryButtonProps {
  isRetrying: boolean;
  attempt: number;
  maxRetries: number;
  canRetry: boolean;
  onRetry: () => void;
  className?: string;
}

export function TransactionRetryButton({
  isRetrying,
  attempt,
  maxRetries,
  canRetry,
  onRetry,
  className,
}: TransactionRetryButtonProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Button
        onClick={onRetry}
        disabled={isRetrying || !canRetry}
        variant="outline"
        size="sm"
        className="h-9"
      >
        {isRetrying ? (
          <>
            <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" aria-hidden="true" />
            Retrying…
          </>
        ) : (
          <>
            <RefreshCw className="mr-1.5 h-3 w-3" aria-hidden="true" />
            Retry
          </>
        )}
      </Button>
      {attempt > 0 && (
        <span className="text-xs text-muted-foreground" aria-live="polite">
          Attempt {attempt}/{maxRetries}
        </span>
      )}
      {!canRetry && attempt > 0 && (
        <span className="flex items-center gap-1 text-xs text-accent-warning">
          <Info className="h-3 w-3" aria-hidden="true" />
          Max retries reached
        </span>
      )}
    </div>
  );
}
