"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { PnLShareCardGenerator } from "@/components/analytics/PnLShareCardGenerator";
import { PeriodComparisonWidget } from "@/components/comparison/PeriodComparisonWidget";
import { usePeriodComparison } from "@/hooks/usePeriodComparison";
import { type ComparisonGranularity } from "@/lib/comparison";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { DateRangePicker, type DateRange } from "@/components/DateRangePicker";

const PortfolioAllocationChart = dynamic(
  () =>
    import("@/components/chart/PortfolioAllocationChart").then((mod) => ({
      default: mod.PortfolioAllocationChart,
    })),
  {
    loading: () => <div className="animate-pulse h-48 bg-white/10 rounded" />,
    ssr: false,
  }
);

const PnLWidget = dynamic(
  () =>
    import("@/components/chart/PnLWidget").then((mod) => ({
      default: mod.PnLWidget,
    })),
  {
    loading: () => <div className="animate-pulse h-48 bg-white/10 rounded" />,
    ssr: false,
  }
);

const PerformanceDashboard = dynamic(
  () =>
    import("@/components/performance/PerformanceDashboard").then(
      (m) => m.PerformanceDashboard
    ),
  {
    loading: () => <div className="animate-pulse h-64 bg-white/10 rounded" />,
    ssr: false,
  }
);

// ---------------------------------------------------------------------------
// Inner page — has access to hooks
// ---------------------------------------------------------------------------
function AnalyticsPageInner() {
  // Period-over-period comparison state (#405)
  const [showPeriodComparison, setShowPeriodComparison] = useState(false);
  const [granularity, setGranularity] = useState<ComparisonGranularity>("month");
  const [customRange, setCustomRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
  });

  // Pull current & prior period metrics from the portfolio store / demo data
  const {
    pnl,
    winRate,
    totalTrades,
    priorPnl,
    priorWinRate,
    priorTotalTrades,
    isDemo,
  } = usePeriodComparison();

  return (
    <div className="p-6">
      {/* Header row with toggle */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Portfolio Analytics</h1>

        <button
          onClick={() => setShowPeriodComparison((v) => !v)}
          aria-pressed={showPeriodComparison}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-white/5 text-foreground hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          aria-label={
            showPeriodComparison
              ? "Hide period comparison"
              : "Show period comparison"
          }
        >
          <span>
            {showPeriodComparison ? "Hide" : "Show"} Period Comparison
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400">
            {showPeriodComparison ? "−" : "+"}
          </span>
        </button>
      </div>

      {/* Period Comparison Widget — additive, not replacing benchmark chart */}
      {showPeriodComparison && (
        <div className="mb-6">
          <PeriodComparisonWidget
            pnl={pnl}
            winRate={winRate}
            totalTrades={totalTrades}
            priorPnl={priorPnl}
            priorWinRate={priorWinRate}
            priorTotalTrades={priorTotalTrades}
            granularity={granularity}
            onGranularityChange={setGranularity}
            isDemo={isDemo}
          />

          {/* Demo mode footnote */}
          {isDemo && (
            <p className="mt-2 text-xs text-foreground-muted text-center">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" aria-hidden="true" />
                Demo mode — prior period data is simulated. Connect to a real
                API for historical comparison.
              </span>
            </p>
          )}
        </div>
      )}

      {/* Custom analytics date range */}
      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground-muted">
          Custom range
        </h2>
        <DateRangePicker value={customRange} onChange={setCustomRange} />
      </div>

      {/* Existing charts — unaffected by period comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PortfolioAllocationChart />
        <PnLWidget />
        <div className="md:col-span-2">
          <PerformanceDashboard />
        </div>
        <div className="md:col-span-2">
          <PnLShareCardGenerator />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <RouteErrorBoundary featureName="Analytics">
      <AnalyticsPageInner />
    </RouteErrorBoundary>
  );
}
