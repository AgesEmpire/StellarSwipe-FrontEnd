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
      <h1 className="text-2xl font-bold mb-4">Portfolio Analytics</h1>
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
