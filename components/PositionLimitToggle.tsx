"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Info, Shield, SlidersHorizontal } from "lucide-react";
import { usePositionLimitStore } from "@/store/usePositionLimitStore";

interface PositionLimitToggleProps {
  /** Total portfolio balance in XLM (or base asset) */
  portfolioBalance?: number | null;
  /** Whether portfolio data is still loading */
  isLoading?: boolean;
}

export function PositionLimitToggle({
  portfolioBalance,
  isLoading = false,
}: PositionLimitToggleProps) {
  const { enabled, percentage, toggle, setPercentage } = usePositionLimitStore();

  const portfolioAvailable = portfolioBalance !== null && portfolioBalance !== undefined && !isLoading;

  const calculatedLimit = useMemo(() => {
    if (!portfolioAvailable || !enabled) return null;
    return ((portfolioBalance! * percentage) / 100).toFixed(2);
  }, [portfolioBalance, percentage, enabled, portfolioAvailable]);

  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(100, Math.max(1, Number(e.target.value)));
    setPercentage(val);
  };

  return (
    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-zinc-700/50">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200">Position Limit</span>
          <div className="group relative">
            <Info className="h-3.5 w-3.5 text-zinc-600 cursor-help" />
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 pointer-events-none">
              Cap your trade to a percentage of your portfolio
            </div>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle position limit"
          disabled={!portfolioAvailable}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 ${
            !portfolioAvailable
              ? "cursor-not-allowed opacity-40"
              : enabled
                ? "bg-blue-600"
                : "bg-zinc-700"
          }`}
        >
          <motion.span
            layout
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Explanation text when enabled */}
      <motion.div
        initial={false}
        animate={{
          height: enabled && portfolioAvailable ? "auto" : 0,
          opacity: enabled && portfolioAvailable ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="mt-3 space-y-3">
          <p className="text-xs text-zinc-500">
            Cap trade at <span className="font-medium text-zinc-300">{percentage}%</span> of portfolio
            {calculatedLimit && (
              <span className="text-zinc-400">
                {" "}· Max trade: <span className="font-mono text-zinc-200">{calculatedLimit} XLM</span>
              </span>
            )}
          </p>

          {/* Slider */}
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <input
              type="range"
              min={1}
              max={25}
              step={1}
              value={percentage}
              onChange={handlePercentageChange}
              aria-label="Position limit percentage"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-blue-500
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500
                [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-500/30
                [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110
                [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0"
            />
            <span className="min-w-[3ch] text-right text-xs font-mono text-zinc-400">
              {percentage}%
            </span>
          </div>

          {/* Quick presets */}
          <div className="flex gap-1.5">
            {[1, 3, 5, 10, 15, 25].map((val) => (
              <button
                key={val}
                onClick={() => setPercentage(val)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  percentage === val
                    ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30"
                    : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Disabled state explanation */}
      {!portfolioAvailable && !isLoading && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-xs text-amber-500/70"
        >
          Connect wallet and load portfolio to enable position limits
        </motion.p>
      )}

      {/* Loading state */}
      {isLoading && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-xs text-zinc-500"
        >
          Loading portfolio data...
        </motion.p>
      )}
    </div>
  );
}
