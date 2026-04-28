"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useToastStore, type ToastMessage } from "@/store/useToastStore";
import { cn } from "@/lib/utils";

const toneStyles: Record<ToastMessage["tone"], string> = {
  success: "border-accent-success/30 bg-accent-success/10 text-foreground shadow-sm",
  error:   "border-accent-danger/30  bg-accent-danger/10  text-foreground shadow-sm",
  info:    "border-accent-sky/30     bg-accent-sky/10     text-foreground shadow-sm",
};

const toneIcons: Record<ToastMessage["tone"], typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function ToastProvider() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-0 bottom-4 z-toast mx-auto flex max-w-[min(92vw,420px)] flex-col items-center gap-3 px-4 sm:bottom-auto sm:top-4 sm:right-4 sm:left-auto sm:mx-0 sm:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = toneIcons[toast.tone];
          const ariaLive = toast.tone === "error" ? "assertive" : "polite";

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              role="status"
              aria-live={ariaLive}
              aria-atomic="true"
              className={cn(
                "w-full overflow-hidden rounded-2xl border p-4 shadow-lg",
                toneStyles[toast.tone]
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-current shadow-sm">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 text-sm leading-5 text-current/90">
                      {toast.description}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  aria-label="Dismiss notification"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-current transition hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/50"
                  onClick={() => dismiss(toast.id)}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
