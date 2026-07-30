"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Rendered after the header, before the scrollable content — e.g. quick toggles. */
  headerExtra?: ReactNode;
  ariaLabel: string;
  className?: string;
  /** Selector focused when the sheet opens; defaults to the built-in close button. */
  initialFocus?: string;
}

const DISMISS_DRAG_THRESHOLD = 120;
const DISMISS_VELOCITY_THRESHOLD = 500;

/**
 * Mobile-optimized drawer that slides up from the bottom of the viewport.
 * Supports drag-to-dismiss (past a distance/velocity threshold, so a stray
 * touch doesn't close it), focus trapping, and body scroll locking.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  headerExtra,
  ariaLabel,
  className,
  initialFocus = 'button[aria-label="Close"]',
}: BottomSheetProps) {
  const sheetRef = useFocusTrap({ isActive: open, initialFocus });

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleDragEnd = (
    _event: PointerEvent | MouseEvent | TouchEvent,
    info: PanInfo
  ) => {
    if (
      info.offset.y > DISMISS_DRAG_THRESHOLD ||
      info.velocity.y > DISMISS_VELOCITY_THRESHOLD
    ) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
            onClick={onClose}
          />

          <motion.div
            key="sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-white/10 bg-slate-900 pb-safe shadow-2xl shadow-black/60",
              className
            )}
            style={{ maxHeight: "85dvh", overflowY: "auto" }}
          >
            <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            {(title || headerExtra) && (
              <div className="flex items-center justify-between px-4 py-3">
                {title && (
                  <span className="text-sm font-semibold text-white">
                    {title}
                  </span>
                )}
                <div className="flex items-center gap-3">
                  {headerExtra}
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
