"use client";

import dynamic from "next/dynamic";
import { PnLShareCardGenerator } from "@/components/analytics/PnLShareCardGenerator";

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

import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

function AnalyticsPageInner() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Portfolio Analytics</h1>
        
        {/* Period Comparison Toggle */}
        <button
          onClick={togglePeriodComparison}
          aria-pressed={showPeriodComparison}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-white/5 text-foreground hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          aria-label={showPeriodComparison ? "Hide period comparison" : "Show period comparison"}
        >
          <span>{showPeriodComparison ? "Hide" : "Show"} Period Comparison</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400">
            +
          </span>
        </button>
      </div>

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

      {/* Demo Mode Indicator */}
      {isDemo && showPeriodComparison && (
        <div className="mt-4 text-xs text-foreground-muted text-center">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Demo mode: Prior period data is simulated. Connect to real API for historical comparison.
          </span>
        </div>
      )}
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
