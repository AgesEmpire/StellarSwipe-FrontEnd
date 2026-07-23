"use client";

/**
 * QRPairingPanel
 *
 * Displays a scannable QR code and status UI for mobile wallet pairing.
 * Rendered inside WalletSelectionModal when the user picks the QR option.
 */

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Smartphone,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useQRPairing } from "@/hooks/useQRPairing";
import { renderQRCode } from "@/lib/qrcode";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as Sentry from "@sentry/nextjs";

interface QRPairingPanelProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function QRPairingPanel({ onSuccess, onCancel }: QRPairingPanelProps) {
  const {
    status,
    uri,
    secondsLeft,
    ttlMs,
    errorMessage,
    startSession,
    regenerate,
    cancel,
  } = useQRPairing();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start session on mount
  useEffect(() => {
    startSession();
    return () => cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render QR onto canvas whenever URI changes
  useEffect(() => {
    if (!uri || !canvasRef.current) return;
    try {
      renderQRCode(canvasRef.current, uri, {
        size: 220,
        margin: 3,
        darkColor: "#0f172a",
        lightColor: "#ffffff",
      });
    } catch (err) {
      Sentry.captureException(err);
    }
  }, [uri]);

  // Close modal on successful pairing
  useEffect(() => {
    if (status === "paired") {
      const t = setTimeout(onSuccess, 1200); // brief "paired" feedback delay
      return () => clearTimeout(t);
    }
  }, [status, onSuccess]);

  const handleCancel = useCallback(() => {
    cancel();
    onCancel();
  }, [cancel, onCancel]);

  const progressPercent = (secondsLeft / (ttlMs / 1000)) * 100;
  const isExpiredOrError =
    status === "expired" || status === "rejected" || status === "error";

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {/* Instructions */}
      <div className="flex items-center gap-2 text-center text-sm text-foreground-muted">
        <Smartphone
          size={16}
          className="shrink-0 text-blue-400"
          aria-hidden="true"
        />
        <p>Open your mobile wallet app and scan this code to connect.</p>
      </div>

      {/* QR canvas area */}
      <div className="relative">
        {/* Canvas */}
        <div
          className={cn(
            "relative rounded-xl border-2 p-2 transition-colors",
            status === "paired"
              ? "border-green-500/60 bg-green-500/10"
              : status === "expired" ||
                status === "rejected" ||
                status === "error"
              ? "border-red-500/40 bg-red-500/5"
              : "border-border bg-white"
          )}
          aria-label={
            status === "pending" || status === "scanning"
              ? "QR code for wallet pairing"
              : undefined
          }
        >
          <canvas
            ref={canvasRef}
            width={220}
            height={220}
            role="img"
            aria-label="Wallet pairing QR code"
            className={cn(
              "block rounded-lg transition-opacity",
              isExpiredOrError || status === "paired"
                ? "opacity-30"
                : "opacity-100"
            )}
          />

          {/* Overlay states */}
          <AnimatePresence>
            {status === "paired" && (
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <CheckCircle2 size={48} className="text-green-400" />
                <span className="text-sm font-semibold text-green-300">
                  Wallet paired!
                </span>
              </motion.div>
            )}

            {(status === "expired" ||
              status === "rejected" ||
              status === "error") && (
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {status === "rejected" ? (
                  <XCircle size={40} className="text-red-400" />
                ) : status === "expired" ? (
                  <Clock size={40} className="text-amber-400" />
                ) : (
                  <AlertCircle size={40} className="text-red-400" />
                )}
                <p className="text-xs text-center text-foreground-muted max-w-[160px] leading-snug">
                  {errorMessage}
                </p>
              </motion.div>
            )}

            {status === "scanning" && (
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/30 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Loader2 size={36} className="text-blue-400 animate-spin" />
                <span className="text-xs text-blue-200">
                  Waiting for approval…
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Expiry countdown — only show while code is active */}
      {(status === "pending" || status === "scanning") && (
        <div
          className="w-full max-w-[220px] space-y-1"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex items-center justify-between text-xs text-foreground-muted">
            <span className="flex items-center gap-1">
              <Clock size={11} aria-hidden="true" />
              Expires in
            </span>
            <span className="tabular-nums font-medium">
              {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, "0")}
            </span>
          </div>
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-foreground/10"
            aria-hidden="true"
          >
            <motion.div
              className={cn(
                "h-full rounded-full transition-colors",
                secondsLeft > 30 ? "bg-blue-500" : "bg-amber-400"
              )}
              style={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.9, ease: "linear" }}
            />
          </div>
        </div>
      )}

      {/* Status badge */}
      <StatusBadge status={status} />

      {/* Actions */}
      <div className="flex w-full gap-2">
        {isExpiredOrError ? (
          <Button
            onClick={regenerate}
            className="flex-1 gap-2"
            aria-label="Generate a new pairing code"
          >
            <RefreshCw size={14} aria-hidden="true" />
            New code
          </Button>
        ) : status !== "paired" ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={regenerate}
            className="gap-1 text-foreground-muted"
            aria-label="Regenerate pairing code"
          >
            <RefreshCw size={13} aria-hidden="true" />
            Regenerate
          </Button>
        ) : null}

        {status !== "paired" && (
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: {
      label: "Waiting for scan…",
      cls: "bg-blue-500/15 text-blue-300",
    },
    scanning: {
      label: "Wallet scanned — approve in app",
      cls: "bg-blue-500/15 text-blue-300",
    },
    paired: {
      label: "Successfully paired",
      cls: "bg-green-500/15 text-green-300",
    },
    expired: { label: "Code expired", cls: "bg-amber-500/15 text-amber-300" },
    rejected: { label: "Pairing rejected", cls: "bg-red-500/15 text-red-300" },
    error: { label: "Pairing error", cls: "bg-red-500/15 text-red-300" },
  };
  const entry = map[status];
  if (!entry) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        entry.cls
      )}
      role="status"
      aria-live="polite"
    >
      {entry.label}
    </span>
  );
}
