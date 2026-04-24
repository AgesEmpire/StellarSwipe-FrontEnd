"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Zap } from "lucide-react";
import { useSignalPrice } from "@/hooks/useSignalPrice";
import { TradeSkeleton } from "./TradeSkeleton";

interface SignalCardProps {
  loading?: boolean;
  onTrade?: (price: number) => void;
}

export function SignalCard({ loading = false, onTrade }: SignalCardProps) {
  const { price, flash, relativeTime } = useSignalPrice(3000);

  if (loading) return <TradeSkeleton />;

  const roiPositive = price.roi >= 0;
  const flashClass =
    flash === "up" ? "text-green-400" : flash === "down" ? "text-red-400" : "text-white";

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900/80 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">XLM / USDC</p>
          <p className="text-sm font-semibold text-white">Stellar Lumen</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-400">
          <Zap size={11} /> LIVE
        </span>
      </div>

      {/* Chart placeholder */}
      <div className="h-28 w-full rounded-xl bg-white/5 flex items-center justify-center text-gray-600 text-xs">
        Chart area
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        {/* Execution Price */}
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Exec. Price</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={price.executionPrice}
              className={`text-sm font-mono font-semibold transition-colors duration-300 ${flashClass}`}
              initial={{ opacity: 0.4, y: flash === "up" ? 4 : flash === "down" ? -4 : 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              ${price.executionPrice.toFixed(4)}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* ROI */}
        <div>
          <p className="text-xs text-gray-500 mb-0.5">ROI</p>
          <p className={`text-sm font-semibold flex items-center gap-0.5 ${roiPositive ? "text-green-400" : "text-red-400"}`}>
            {roiPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {roiPositive ? "+" : ""}{price.roi.toFixed(2)}%
          </p>
        </div>

        {/* Confidence */}
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Confidence</p>
          <p className={`text-sm font-semibold ${price.confidence >= 70 ? "text-emerald-400" : price.confidence >= 40 ? "text-yellow-400" : "text-red-400"}`}>
            {price.confidence}%
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-gray-500">{relativeTime}</p>
        <button
          onClick={() => onTrade?.(price.executionPrice)}
          className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors"
        >
          Trade
        </button>
      </div>
    </div>
  );
}
