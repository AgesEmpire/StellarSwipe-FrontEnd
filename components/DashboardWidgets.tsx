"use client";

import { useState, type ReactNode } from "react";
import { useDashboardLayoutStore, type DashboardWidgetId } from "@/store/useDashboardLayoutStore";
import { DashboardWidgetControls } from "@/components/DashboardWidgetControls";
import { PortfolioSummaryCards } from "@/components/PortfolioSummaryCards";
import { PortfolioAllocationChart } from "@/components/chart/PortfolioAllocationChart";
import { PnLWidget } from "@/components/chart/PnLWidget";
import { TransactionActivityFeed } from "@/components/TransactionActivityFeed";
import { FullscreenChartFrame } from "@/components/chart/FullscreenChartFrame";

const WIDGETS: Record<DashboardWidgetId, { label: string; render: () => ReactNode }> = {
  "portfolio-summary": { label: "Portfolio summary", render: () => <PortfolioSummaryCards /> },
  "portfolio-allocation": {
    label: "Portfolio allocation",
    render: () => (
      <FullscreenChartFrame title="Portfolio Allocation">
        <PortfolioAllocationChart />
      </FullscreenChartFrame>
    ),
  },
  "pnl-overview": { label: "P&L overview", render: () => <PnLWidget /> },
  "transaction-activity": { label: "Transaction activity", render: () => <TransactionActivityFeed /> },
};

/** Dashboard sidebar widgets, reorderable via keyboard controls (see DashboardWidgetControls). */
export function DashboardWidgets() {
  const order = useDashboardLayoutStore((s) => s.order);
  const [announcement, setAnnouncement] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      {order.map((id) => {
        const widget = WIDGETS[id];
        if (!widget) return null;
        return (
          <section key={id} aria-label={widget.label} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                {widget.label}
              </h2>
              <DashboardWidgetControls id={id} label={widget.label} onMoved={setAnnouncement} />
            </div>
            {widget.render()}
          </section>
        );
      })}
    </div>
  );
}
