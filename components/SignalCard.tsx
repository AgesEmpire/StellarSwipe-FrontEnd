"use client";

import { useState, useRef } from "react";
import { TrendingUp, TrendingDown, Minus, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignalBadge } from "@/components/SignalBadge";
import { SignalTimestamp } from "@/components/SignalTimestamp";
import { TradeSkeleton } from "@/components/TradeSkeleton";
import { TradeModal } from "@/components/TradeModal";
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

function MiniROIChart({ data }: { data: ROIPoint[] }) {
  if (!data.length) return null;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 120;
  const h = 40;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((d.value - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const isPositive = values[values.length - 1] >= values[0];
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-label="ROI chart"
      role="img"
      className="overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? "#22c55e" : "#ef4444"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  const [modalOpen, setModalOpen] = useState(false);
  const executingRef = useRef(false);

  if (loading) return <TradeSkeleton />;
  if (passed) return null;

  const roi = (((projectedTarget - executionPrice) / executionPrice) * 100).toFixed(2);
  const isPositive = parseFloat(roi) >= 0;
  const DirectionIcon = signal === "BUY" ? TrendingUp : signal === "SELL" ? TrendingDown : Minus;

  function handlePass() {
    setPassed(true);
    onPass?.();
  }

  function handleExecuteTrade() {
    if (executingRef.current) return;
    executingRef.current = true;
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    executingRef.current = false;
  }

  function handleModalConfirm() {
    setModalOpen(false);
    executingRef.current = false;
    onTrade?.(executionPrice);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      if (e.key === "ArrowLeft") {
        handlePass();
      } else {
        handleExecuteTrade();
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
        <MiniROIChart data={roiHistory} />
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
          onClick={handleExecuteTrade}
          disabled={modalOpen}
          className="flex-1 active:scale-95"
          aria-label={`Execute trade: ${signal} signal for ${pair} at ${executionPrice}`}
        >
          <Zap size={16} className="mr-1" />
          Execute Trade
        </Button>
      </div>

      <TradeModal
        open={modalOpen}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        marketPrice={executionPrice}
      />
    </article>
  );
}
