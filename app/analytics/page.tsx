"use client"

import dynamic from "next/dynamic"

const PortfolioAllocationChart = dynamic(
  () => import("@/components/chart/PortfolioAllocationChart").then((mod) => ({ default: mod.PortfolioAllocationChart })),
  {
    loading: () => <div className="animate-pulse h-48 bg-white/10 rounded" />,
    ssr: false,
  }
)

const PnLWidget = dynamic(
  () => import("@/components/chart/PnLWidget").then((mod) => ({ default: mod.PnLWidget })),
  {
    loading: () => <div className="animate-pulse h-48 bg-white/10 rounded" />,
    ssr: false,
  }
)

const PerformanceDashboard = dynamic(
  () => import("@/components/performance/PerformanceDashboard").then((m) => m.PerformanceDashboard),
  {
    loading: () => <div className="animate-pulse h-64 bg-white/10 rounded" />,
    ssr: false,
  }
)

const PeriodComparisonWidget = dynamic(
  () => import("@/components/comparison/PeriodComparisonWidget").then((m) => ({ default: m.PeriodComparisonWidget })),
  {
    loading: () => <div className="animate-pulse h-64 bg-white/10 rounded" />,
    ssr: false,
  }
)

export default function AnalyticsPage() {
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
          <PeriodComparisonWidget
            pnl={1500}
            winRate={62.5}
            totalTrades={40}
            priorPnl={1200}
            priorWinRate={58}
            priorTotalTrades={36}
          />
        </div>
      </div>
    </div>
  )
}
