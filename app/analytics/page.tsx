"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { PnLShareCardGenerator } from "@/components/analytics/PnLShareCardGenerator";
import { PeriodComparisonWidget } from "@/components/comparison/PeriodComparisonWidget";
import { usePeriodComparison } from "@/hooks/usePeriodComparison";
import { type ComparisonGranularity } from "@/lib/comparison";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { DateRangePicker, type DateRange } from "@/components/DateRangePicker";
import { parseAnalyticsRange, serializeAnalyticsRange } from "@/lib/analyticsDateRange";

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

// Freshness threshold (ms) after which data is considered stale (#773)
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

type RefreshStatus = "idle" | "pending" | "success" | "error";

// ---------------------------------------------------------------------------
// Inner page — has access to hooks
// ---------------------------------------------------------------------------
function AnalyticsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Period-over-period comparison state (#405)
  const [showPeriodComparison, setShowPeriodComparison] = useState(false);
  const [granularity, setGranularity] = useState<ComparisonGranularity>("month");
  const [customRange, setCustomRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
  });

  // Stale-data tracking + refresh state (#773)
  const [lastUpdated, setLastUpdated] = useState<number>(() => Date.now());
  const [isStale, setIsStale] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>("idle");
  const statusResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const range = parseAnalyticsRange(searchParams.toString());
    if (range) setCustomRange(range);
  }, [searchParams]);

  // Mark data stale once it ages past the freshness threshold.
  useEffect(() => {
    const check = () => setIsStale(Date.now() - lastUpdated > STALE_THRESHOLD_MS);
    check();
    const interval = setInterval(check, 30 * 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  useEffect(() => {
    return () => {
      if (statusResetRef.current) clearTimeout(statusResetRef.current);
    };
  }, []);

  const updateCustomRange = (range: DateRange) => {
    setCustomRange(range);
    router.replace(`${pathname}${serializeAnalyticsRange(range)}`, { scroll: false });
  };

  // Refresh preserves filters, scroll position, and selected tabs by only
  // re-fetching data (router.refresh) without navigating or resetting state.
  const handleRefresh = useCallback(async () => {
    if (refreshStatus === "pending") return;
    setRefreshStatus("pending");
    if (statusResetRef.current) clearTimeout(statusResetRef.current);
    try {
      router.refresh();
      setLastUpdated(Date.now());
      setIsStale(false);
      setRefreshStatus("success");
    } catch {
      setRefreshStatus("error");
    } finally {
      statusResetRef.current = setTimeout(() => setRefreshStatus("idle"), 4000);
    }
  }, [refreshStatus, router]);

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

  const refreshLabel =
    refreshStatus === "pending"
      ? "Refreshing…"
      : refreshStatus === "success"
        ? "Updated"
        : refreshStatus === "error"
          ? "Refresh failed"
          : "Refresh";

  return (
    <div className="p-6">
      {/* Header row with toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-2xl font-bold">Portfolio Analytics</h1>

        <div className="flex flex-wrap items-center gap-2">
          {/* Stale-data badge — informational, not an error (#773) */}
          {isStale && (
            <span
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400"
            >
              <span
                className="w-2 h-2 rounded-full bg-amber-400"
                aria-hidden="true"
              />
              Data may be out of date
            </span>
          )}

          {/* Refresh action with pending / success / failure states (#773) */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshStatus === "pending"}
            aria-busy={refreshStatus === "pending"}
            aria-live="polite"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-white/5 text-foreground hover:bg-white/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label={
              refreshStatus === "pending"
                ? "Refreshing analytics data"
                : refreshStatus === "success"
                  ? "Analytics data updated"
                  : refreshStatus === "error"
                    ? "Refresh failed, try again"
                    : "Refresh analytics data"
            }
          >
            <span
              aria-hidden="true"
              className={
                refreshStatus === "pending" ? "animate-spin" : undefined
              }
            >
              {refreshStatus === "success"
                ? "✓"
                : refreshStatus === "error"
                  ? "!"
                  : "↻"}
            </span>
            <span>{refreshLabel}</span>
          </button>

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
        <DateRangePicker value={customRange} onChange={updateCustomRange} />
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
