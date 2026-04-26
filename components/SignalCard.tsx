"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignalBadge } from "@/components/SignalBadge";
import { SignalTimestamp } from "@/components/SignalTimestamp";
import { TradeSkeleton } from "@/components/TradeSkeleton";
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

  if (loading) return <TradeSkeleton />;
  if (passed) return null;

  const roi = (((projectedTarget - executionPrice) / executionPrice) * 100).toFixed(2);
  const isPositive = parseFloat(roi) >= 0;
  const DirectionIcon = signal === "BUY" ? TrendingUp : signal === "SELL" ? TrendingDown : Minus;

  function handlePass() {
    setPassed(true);
    onPass?.();
  }

  return (
    <div className="w-full rounded-2xl border bg-card p-4 shadow-sm flex flex-col gap-3 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-base sm:text-lg">{asset}</span>
        <SignalBadge signal={signal} />
      </div>
    </article>
  );
}
