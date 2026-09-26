"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ExportPreviewItem {
  label: string;
  value: string;
}

interface ExportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  items: ExportPreviewItem[];
  confirmLabel: string;
  successMessage?: string;
  onConfirm: () => Promise<void> | void;
}

type ExportPreviewState = "idle" | "working" | "success" | "error";

/**
 * Shared preview/confirmation dialog for export & share flows (portfolio
 * snapshots, reports, comparison outputs). Shows exactly what will be
 * exported before anything downloads, then surfaces a clear success or
 * failure state so the action feels reliable instead of a silent download.
 */
export function ExportPreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  items,
  confirmLabel,
  successMessage = "Export ready — check your downloads.",
  onConfirm,
}: ExportPreviewDialogProps) {
  const [state, setState] = useState<ExportPreviewState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    // Don't let the dialog be dismissed mid-export — avoids orphaned downloads.
    if (state === "working") return;
    onOpenChange(next);
    if (!next) {
      setState("idle");
      setErrorMessage(null);
    }
  };

  const handleConfirm = async () => {
    setState("working");
    setErrorMessage(null);
    try {
      await onConfirm();
      setState("success");
      window.setTimeout(() => {
        onOpenChange(false);
        setState("idle");
      }, 1100);
    } catch (err) {
      setState("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong preparing this export. Please try again."
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <dl className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4"
            >
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="text-right font-medium text-foreground">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        {state === "success" && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {successMessage}
          </div>
        )}

        {state === "error" && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {errorMessage}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={state === "working"}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={state === "working" || state === "success"}
            className="gap-2"
          >
            {state === "working" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Preparing…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
