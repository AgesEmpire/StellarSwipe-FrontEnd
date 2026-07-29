"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FilterDirection,
  useSignalFilterStore,
} from "@/store/useSignalFilterStore";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const DIRECTIONS: { label: string; value: FilterDirection }[] = [
  { label: "All", value: "ALL" },
  { label: "Buy", value: "BUY" },
  { label: "Sell", value: "SELL" },
];

const TIMEFRAMES = ["1h", "4h", "1d", "1w"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

interface SignalFilterBottomSheetProps {
  open: boolean;
  onClose: () => void;
  availableProviders?: string[];
  availableMarkets?: string[];
  /** Currently selected timeframe */
  timeframe?: Timeframe;
  onTimeframeChange?: (t: Timeframe) => void;
}

export function SignalFilterBottomSheet({
  open,
  onClose,
  availableProviders = [],
  availableMarkets = [],
  timeframe = "1d",
  onTimeframeChange,
}: SignalFilterBottomSheetProps) {
  const {
    direction,
    asset,
    provider,
    bookmarkedOnly,
    setDirection,
    setAsset,
    setProvider,
    setBookmarkedOnly,
    reset,
  } = useSignalFilterStore();

  const sheetRef = useFocusTrap({
    isActive: open,
    // Focus the close button when the sheet opens
    initialFocus: 'button[aria-label="Close filters"]',
  });

  // Prevent body scroll while sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  const isActive =
    direction !== "ALL" || asset !== "" || provider !== "" || bookmarkedOnly;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
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

          {/* Bottom sheet */}
          <motion.div
            key="sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Signal feed filters"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-white/10 bg-slate-900 pb-safe shadow-2xl shadow-black/60"
            style={{ maxHeight: "85dvh", overflowY: "auto" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-white">
                <SlidersHorizontal size={15} aria-hidden="true" />
                Filters
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
                  aria-pressed={bookmarkedOnly}
                  className={cn(
                    "rounded-full px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                    bookmarkedOnly
                      ? "bg-sky-500/15 text-sky-300 border border-sky-500/40"
                      : "bg-white/5 text-slate-300 border border-white/10 hover:border-white/20 hover:text-white"
                  )}
                >
                  Bookmarked
                </button>
                {isActive && (
                  <button
                    onClick={reset}
                    className="text-xs text-sky-400 hover:text-sky-300 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded"
                    aria-label="Clear all filters"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close filters"
                  className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="px-4 pb-6 space-y-5">
              {/* Direction row */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Direction
                </p>
                <div
                  role="group"
                  aria-label="Filter by direction"
                  className="flex gap-2"
                >
                  {DIRECTIONS.map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDirection(value)}
                      aria-pressed={direction === value}
                      className={cn(
                        "flex-1 rounded-xl py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                        direction === value
                          ? value === "BUY"
                            ? "bg-green-500/20 text-green-400 border border-green-500/40"
                            : value === "SELL"
                            ? "bg-red-500/20 text-red-400 border border-red-500/40"
                            : "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                          : "bg-white/5 text-slate-400 border border-white/10 hover:border-white/20"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider row */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Provider
                </p>
                {availableProviders.length > 0 ? (
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    aria-label="Filter by provider"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 hover:border-white/20 transition-colors"
                  >
                    <option value="">All providers</option>
                    {availableProviders.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="Search provider…"
                    aria-label="Filter by provider"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-500 hover:border-white/20 transition-colors"
                  />
                )}
              </div>

              {/* Market row */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Market
                </p>
                {availableMarkets.length > 0 ? (
                  <select
                    value={asset}
                    onChange={(e) => setAsset(e.target.value)}
                    aria-label="Filter by market"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 hover:border-white/20 transition-colors"
                  >
                    <option value="">All markets</option>
                    {availableMarkets.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={asset}
                    onChange={(e) => setAsset(e.target.value.toUpperCase())}
                    placeholder="e.g. XLM"
                    aria-label="Filter by market"
                    maxLength={10}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-500 hover:border-white/20 transition-colors"
                  />
                )}
              </div>

              {/* Timeframe row */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Timeframe
                </p>
                <div
                  role="group"
                  aria-label="Filter by timeframe"
                  className="flex gap-2"
                >
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => onTimeframeChange?.(tf)}
                      aria-pressed={timeframe === tf}
                      className={cn(
                        "flex-1 rounded-xl py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                        timeframe === tf
                          ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                          : "bg-white/5 text-slate-400 border border-white/10 hover:border-white/20"
                      )}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active filter summary */}
              {isActive && (
                <p className="text-xs text-slate-500" aria-live="polite">
                  Active:{" "}
                  {[
                    direction !== "ALL" && `Direction: ${direction}`,
                    asset && `Market: ${asset}`,
                    provider && `Provider: ${provider}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}

              {/* Apply button */}
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-sky-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-400 active:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Apply filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
