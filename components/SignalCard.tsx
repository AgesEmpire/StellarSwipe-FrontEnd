"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignalBadge } from "@/components/SignalBadge";
import { SignalTimestamp } from "@/components/SignalTimestamp";
import { TradeSkeleton } from "@/components/TradeSkeleton";
import { MiniChart } from "@/components/chart/MiniChart";
import { cn } from "@/lib/utils";

interface ROIPoint {
  value: number;
}

interface SignalCardProps {
  loading?: boolean;
  pair?: string;
  executionPrice?: number;
  confidence?: number;
  projectedTarget?: number;
  roiHistory?: ROIPoint[];
  analysis?: string;
  signal?: "BUY" | "SELL";
  timestamp?: Date;
  onTrade?: (price: number) => void;
  onPass?: () => void;
}

const DEFAULT_ROI: ROIPoint[] = [
  { value: 0 }, { value: 1.2 }, { value: 0.8 }, { value: 2.1 },
  { value: 1.9 }, { value: 3.4 }, { value: 2.8 }, { value: 4.2 },
];

export function SignalCard({
  loading = false,
  pair = "XLM/USDC",
  executionPrice = 0.4821,
  confidence = 87,
  projectedTarget = 0.5310,
  roiHistory = DEFAULT_ROI,
  analysis = "Momentum building after a strong volume breakout above the 50-day MA. RSI at 62 with room to run.",
  signal = "BUY",
  timestamp = new Date(Date.now() - 5 * 60 * 1000),
  onTrade,
  onPass,
}: SignalCardProps) {
  const [passed, setPassed] = useState(false);

  if (loading) return <TradeSkeleton />;
  if (passed) return null;

  const roi = (((projectedTarget - executionPrice) / executionPrice) * 100).toFixed(2);
  const isPositive = parseFloat(roi) >= 0;
  const DirectionIcon = signal === "BUY" ? TrendingUp : signal === "SELL" ? TrendingDown : Minus;

  function handlePass() {
    setPassed(true);
    onPass?.();
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      if (e.key === "ArrowLeft") {
        handlePass();
      } else {
        onTrade?.(executionPrice);
      }
    }
  };

  return (
    <article 
      className="w-full rounded-2xl border bg-card p-4 shadow-sm flex flex-col gap-3 sm:p-5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 focus-within:ring-offset-background"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="article"
      aria-label={`${signal} signal for ${pair} at ${executionPrice} with ${confidence}% confidence`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-base sm:text-lg">{pair}</span>
        <SignalBadge signal={signal} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Execution Price</p>
          <p className="font-mono font-semibold">${executionPrice.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Confidence</p>
          <p className="font-semibold">{confidence}%</p>
        </div>
        <div>
          <p className="text-muted-foreground">Target</p>
          <p className="font-mono font-semibold">${projectedTarget.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">ROI</p>
          <p className={cn("font-semibold", isPositive ? "text-green-600" : "text-red-600")}>
            {isPositive ? "+" : ""}{roi}%
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DirectionIcon size={16} className={cn(
          signal === "BUY" ? "text-green-600" : signal === "SELL" ? "text-red-600" : "text-gray-500"
        )} />
        <MiniChart data={roiHistory.map((d) => d.value)} />
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{analysis}</p>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <SignalTimestamp updatedAt={timestamp} />
        <p className="text-xs text-muted-foreground">
          Use ← to pass, → to trade, or buttons below
        </p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePass}
          className="flex-1"
          aria-label={`Pass on ${signal} signal for ${pair}`}
        >
          <X size={16} className="mr-1" />
          Pass
        </Button>
        <Button
          size="sm"
          onClick={() => onTrade?.(executionPrice)}
          className="flex-1"
          aria-label={`Trade ${signal} signal for ${pair} at ${executionPrice}`}
        >
          <Zap size={16} className="mr-1" />
          Trade
        </Button>
      </div>
    </article>
  );
}
