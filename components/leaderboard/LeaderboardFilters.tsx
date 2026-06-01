"use client";

import { cn } from "@/lib/utils";
import type { RankingPeriod, MarketType } from "@/lib/leaderboard";

interface LeaderboardFiltersProps {
  period: RankingPeriod;
  marketFilter: MarketType;
  onPeriodChange: (p: RankingPeriod) => void;
  onMarketFilterChange: (m: MarketType) => void;
}

const PERIODS: { value: RankingPeriod; label: string }[] = [
  { value: "daily", label: "24h" },
  { value: "weekly", label: "7d" },
  { value: "monthly", label: "30d" },
  { value: "yearly", label: "1y" },
  { value: "all", label: "All Time" },
];

const MARKETS: { value: MarketType; label: string; emoji: string }[] = [
  { value: "all", label: "All Markets", emoji: "🌐" },
  { value: "crypto", label: "Crypto", emoji: "₿" },
  { value: "forex", label: "Forex", emoji: "💱" },
  { value: "commodities", label: "Commodities", emoji: "🛢️" },
];

export function LeaderboardFilters({
  period,
  marketFilter,
  onPeriodChange,
  onMarketFilterChange,
}: LeaderboardFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Period selector */}
      <div
        role="group"
        aria-label="Ranking period"
        className="flex rounded-lg bg-muted/40 p-1 gap-0.5"
      >
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            aria-pressed={period === p.value}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              period === p.value
                ? "bg-card text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Market filter */}
      <div
        role="group"
        aria-label="Market type filter"
        className="flex flex-wrap gap-2"
      >
        {MARKETS.map((m) => (
          <button
            key={m.value}
            onClick={() => onMarketFilterChange(m.value)}
            aria-pressed={marketFilter === m.value}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              marketFilter === m.value
                ? "border-blue-500 bg-blue-500/10 text-blue-300"
                : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
            )}
          >
            <span aria-hidden="true">{m.emoji}</span>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
