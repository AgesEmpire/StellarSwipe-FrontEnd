"use client";

import React, { useMemo } from "react";
import { AlertCircle, Info } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ComparisonGranularitySelector } from "./ComparisonGranularitySelector";
import { ComparisonMetricCard } from "./ComparisonMetricCard";
import {
  type ComparisonGranularity,
  type PeriodComparisonData,
  formatDateRange,
  createPeriodComparison,
} from "@/lib/comparison";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PeriodComparisonWidgetProps {
  /** Current period metrics */
  pnl: number;
  winRate: number;
  totalTrades: number;

  /** Prior period metrics (null if unavailable) */
  priorPnl: number | null;
  priorWinRate: number | null;
  priorTotalTrades: number | null;

  /** Additional optional metrics */
  additionalMetrics?: Array<{
    label: string;
    current: number;
    prior: number | null;
    suffix?: string;
  }>;

  className?: string;
}

/**
 * PeriodComparisonWidget — Displays period-over-period comparison metrics.
 *
 * Features:
 * - Granularity selector (week, month, quarter, year)
 * - Multiple comparison metrics (P&L, win rate, trades, etc.)
 * - Partial period detection and labeling
 * - Accessible design (color + icons + text)
 * - Mobile responsive layout
 *
 * Coexists with existing benchmark overlay widget; no breaking changes.
 */
export function PeriodComparisonWidget({
  pnl,
  winRate,
  totalTrades,
  priorPnl,
  priorWinRate,
  priorTotalTrades,
  additionalMetrics = [],
  className,
}: PeriodComparisonWidgetProps) {
  const [granularity, setGranularity] = React.useState<ComparisonGranularity>("month");
  const now = new Date();

  // Generate comparison data for each metric
  const pnlComparison = useMemo(
    () => createPeriodComparison(pnl, priorPnl, granularity, now, false),
    [pnl, priorPnl, granularity, now]
  );

  const winRateComparison = useMemo(
    () => createPeriodComparison(winRate, priorWinRate, granularity, now, false),
    [winRate, priorWinRate, granularity, now]
  );

  const tradesComparison = useMemo(
    () => createPeriodComparison(totalTrades, priorTotalTrades, granularity, now, false),
    [totalTrades, priorTotalTrades, granularity, now]
  );

  // Handle additional metrics
  const additionalComparisons = useMemo(
    () =>
      additionalMetrics.map((metric) =>
        createPeriodComparison(metric.current, metric.prior, granularity, now, false)
      ),
    [additionalMetrics, granularity, now]
  );

  // Check if any metric has incomplete data
  const hasIncompleteData =
    !pnlComparison.currentPeriod.isComplete ||
    !winRateComparison.currentPeriod.isComplete ||
    !tradesComparison.currentPeriod.isComplete;

  // Check if any metric has missing prior data
  const hasMissingPriorData =
    pnlComparison.metadata.hasNoPriorData ||
    winRateComparison.metadata.hasNoPriorData ||
    tradesComparison.metadata.hasNoPriorData;

  const currentPeriodRange = pnlComparison.currentPeriod.range;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Period Comparison</h3>
            <p className="text-xs text-foreground-muted mt-1">
              {formatDateRange(currentPeriodRange.start, currentPeriodRange.end)}
            </p>
          </div>
          <ComparisonGranularitySelector
            value={granularity}
            onChange={setGranularity}
          />
        </div>

        {/* Incomplete Period Warning */}
        {hasIncompleteData && (
          <div className="mt-3 flex gap-2 rounded-lg bg-amber-500/10 px-3 py-2 border border-amber-500/20">
            <AlertCircle
              size={16}
              className="flex-shrink-0 text-amber-400 mt-0.5"
              aria-hidden="true"
            />
            <div className="text-xs text-amber-200">
              This period is incomplete (
              {pnlComparison.currentPeriod.completenessPercent}% complete). Metrics may
              change as the period progresses.
            </div>
          </div>
        )}

        {/* Missing Prior Data Notice */}
        {hasMissingPriorData && (
          <div className="mt-3 flex gap-2 rounded-lg bg-sky-500/10 px-3 py-2 border border-sky-500/20">
            <Info
              size={16}
              className="flex-shrink-0 text-sky-400 mt-0.5"
              aria-hidden="true"
            />
            <div className="text-xs text-sky-200">
              No prior period data available for this comparison.
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Core Metrics */}
          <ComparisonMetricCard
            label="P&L"
            metrics={pnlComparison.metrics}
            formatValue={(v) => `$${formatNumber(v, 2)}`}
            suffix="USD"
          />

          <ComparisonMetricCard
            label="Win Rate"
            metrics={winRateComparison.metrics}
            formatValue={(v) => `${formatNumber(v, 1)}%`}
            showAbsoluteOnly
          />

          <ComparisonMetricCard
            label="Total Trades"
            metrics={tradesComparison.metrics}
            formatValue={(v) => Math.round(v).toString()}
          />

          {/* Additional Metrics */}
          {additionalMetrics.map((metric, index) => (
            <ComparisonMetricCard
              key={`${metric.label}-${index}`}
              label={metric.label}
              metrics={additionalComparisons[index].metrics}
              suffix={metric.suffix}
            />
          ))}
        </div>

        {/* Period Range Reference */}
        <div className="mt-4 grid gap-2 text-xs text-foreground-subtle pt-4 border-t border-border/30">
          <div>
            <span className="font-medium">Current:</span>{" "}
            {formatDateRange(
              currentPeriodRange.start,
              currentPeriodRange.end
            )}
          </div>
          <div>
            <span className="font-medium">Prior:</span>{" "}
            {formatDateRange(
              pnlComparison.priorPeriod.range.start,
              pnlComparison.priorPeriod.range.end
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
