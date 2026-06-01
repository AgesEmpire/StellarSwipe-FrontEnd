"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  Activity,
  Award,
  AlertTriangle,
  Download,
  Loader2,
  Calendar,
  Target,
  Zap,
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAnalytics, type TimeRange, type TradeRecord, type MonthlyReturn } from "@/hooks/useAnalytics";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtUsd(v: number) {
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(v: number) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

// ── Portfolio value chart (SVG line chart) ────────────────────────────────────

function PortfolioChart({ data }: { data: { date: string; value: number }[] }) {
  if (data.length < 2) return null;
  const W = 600, H = 160, PAD = 8;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((d.value - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(" ");
  const firstPt = points[0].split(",");
  const lastPt = points[points.length - 1].split(",");
  const fillPath = `M${firstPt[0]},${H} L${polyline} L${lastPt[0]},${H} Z`;

  const isPositive = values[values.length - 1] >= values[0];
  const color = isPositive ? "hsl(var(--accent-success))" : "hsl(var(--accent-danger))";

  // Show a few date labels
  const labelIndices = [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" aria-label="Portfolio value chart">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill="url(#chartGrad)" />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {labelIndices.map((idx) => {
          const [x] = points[idx].split(",");
          return (
            <text key={idx} x={x} y={H + 16} textAnchor="middle" fontSize="10" fill="hsl(var(--foreground-subtle))">
              {data[idx].date.slice(5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ── Monthly returns heatmap ───────────────────────────────────────────────────

function MonthlyHeatmap({ data }: { data: MonthlyReturn[] }) {
  const max = Math.max(...data.map((d) => Math.abs(d.returnPercent)), 1);

  return (
    <div className="flex flex-wrap gap-2">
      {data.map((d) => {
        const intensity = Math.abs(d.returnPercent) / max;
        const isPos = d.returnPercent >= 0;
        const bg = isPos
          ? `hsl(var(--accent-success) / ${0.15 + intensity * 0.6})`
          : `hsl(var(--accent-danger) / ${0.15 + intensity * 0.6})`;
        return (
          <div
            key={`${d.year}-${d.month}`}
            className="rounded-lg p-3 text-center min-w-[72px] border border-border"
            style={{ backgroundColor: bg }}
            title={`${MONTH_NAMES[d.month]} ${d.year}: ${fmtPct(d.returnPercent)}`}
          >
            <p className="text-[11px] text-foreground-muted">{MONTH_NAMES[d.month]} {d.year}</p>
            <p className={cn("text-sm font-bold", isPos ? "text-[hsl(var(--accent-success))]" : "text-[hsl(var(--accent-danger))]")}>
              {fmtPct(d.returnPercent)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Correlation matrix ────────────────────────────────────────────────────────

function CorrelationMatrix({ data }: { data: { assetA: string; assetB: string; correlation: number }[] }) {
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={`${d.assetA}-${d.assetB}`} className="flex items-center gap-3">
          <span className="text-xs text-foreground-muted w-20 shrink-0">{d.assetA} / {d.assetB}</span>
          <div className="flex-1 h-2 rounded-full bg-surface-high overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.abs(d.correlation) * 100}%`,
                backgroundColor: d.correlation > 0.7 ? "hsl(var(--accent-warning))" : "hsl(var(--accent-primary))",
              }}
            />
          </div>
          <span className={cn("text-xs font-mono w-10 text-right", d.correlation > 0.7 ? "text-[hsl(var(--accent-warning))]" : "text-foreground-muted")}>
            {d.correlation.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Trade row ─────────────────────────────────────────────────────────────────

function TradeRow({ trade }: { trade: TradeRecord }) {
  const isWin = trade.outcome === "WIN";
  return (
    <div className={cn(
      "flex items-center justify-between rounded-lg border px-4 py-3",
      isWin ? "bg-[hsl(var(--accent-success)/0.08)] border-[hsl(var(--accent-success)/0.2)]"
             : "bg-[hsl(var(--accent-danger)/0.08)] border-[hsl(var(--accent-danger)/0.2)]"
    )}>
      <div className="flex items-center gap-3">
        <span className={cn("text-xs px-2 py-0.5 rounded font-medium", trade.direction === "BUY" ? "bg-green-600 text-white" : "bg-red-600 text-white")}>
          {trade.direction}
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{trade.asset}</p>
          <p className="text-xs text-foreground-muted">{trade.providerName}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn("text-sm font-bold", isWin ? "text-[hsl(var(--accent-success))]" : "text-[hsl(var(--accent-danger))]")}>
          {isWin ? "+" : ""}${fmtUsd(trade.pnl)}
        </p>
        <p className={cn("text-xs", isWin ? "text-[hsl(var(--accent-success))]" : "text-[hsl(var(--accent-danger))]")}>
          {fmtPct(trade.pnlPercent)}
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TIME_RANGES: TimeRange[] = ["1D", "1W", "1M", "1Y"];

export default function AnalyticsPage() {
  const [range, setRange] = useState<TimeRange>("1M");
  const { data, isLoading } = useAnalytics(range);

  function exportPDF() {
    toast.info("Generating PDF report…", { description: "Your report will download shortly." });
    // In production: call a PDF generation service
    setTimeout(() => toast.success("Report ready", { description: "analytics-report.pdf downloaded." }), 2000);
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-[hsl(var(--background))] pb-16">
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BarChart2 size={24} className="text-[hsl(var(--accent-primary))]" />
                Analytics
              </h1>
              <p className="text-sm text-foreground-muted mt-1">
                Detailed portfolio performance metrics and insights.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={exportPDF} className="gap-1.5 shrink-0" aria-label="Export PDF report">
              <Download size={14} /> Export PDF
            </Button>
          </div>

          {/* Time range selector */}
          <div className="flex items-center gap-1 rounded-lg bg-surface-high p-1 w-fit">
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  range === r
                    ? "bg-[hsl(var(--accent-primary))] text-white"
                    : "text-foreground-muted hover:text-foreground"
                )}
                aria-pressed={range === r}
              >
                {r}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
            </div>
          ) : data ? (
            <>
              {/* Portfolio value chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground">Portfolio Value</h2>
                    <div className="text-right">
                      <p className={cn("text-lg font-bold", data.totalReturnPercent >= 0 ? "text-[hsl(var(--accent-success))]" : "text-[hsl(var(--accent-danger))]")}>
                        {fmtPct(data.totalReturnPercent)}
                      </p>
                      <p className="text-xs text-foreground-muted">{fmtUsd(data.totalReturn)} absolute</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <PortfolioChart data={data.portfolioHistory} />
                </CardContent>
              </Card>

              {/* Key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Win Rate",       value: `${data.winRate.toFixed(1)}%`,         icon: Target,       color: "text-[hsl(var(--accent-success))]" },
                  { label: "Sharpe Ratio",   value: data.sharpeRatio.toFixed(2),            icon: Activity,     color: "text-[hsl(var(--accent-primary))]" },
                  { label: "Max Drawdown",   value: `${data.maxDrawdown.toFixed(1)}%`,      icon: AlertTriangle,color: "text-[hsl(var(--accent-danger))]" },
                  { label: "Recovery Days",  value: `${data.maxDrawdownRecoveryDays}d`,     icon: TrendingUp,   color: "text-[hsl(var(--accent-warning))]" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <Card key={label}>
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon size={13} className={cn("shrink-0", color)} aria-hidden="true" />
                        <span className="text-[11px] text-foreground-muted">{label}</span>
                      </div>
                      <p className={cn("text-xl font-bold", color)}>{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Avg win / loss */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp size={13} className="text-[hsl(var(--accent-success))]" />
                      <span className="text-[11px] text-foreground-muted">Avg Win</span>
                    </div>
                    <p className="text-xl font-bold text-[hsl(var(--accent-success))]">+${fmtUsd(data.avgWin)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingDown size={13} className="text-[hsl(var(--accent-danger))]" />
                      <span className="text-[11px] text-foreground-muted">Avg Loss</span>
                    </div>
                    <p className="text-xl font-bold text-[hsl(var(--accent-danger))]">${fmtUsd(data.avgLoss)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Provider attribution */}
              <Card>
                <CardHeader>
                  <h2 className="text-base font-semibold text-foreground">Performance by Provider</h2>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.providerAttribution.map((p) => {
                    const isPos = p.totalPnl >= 0;
                    return (
                      <div key={p.providerId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{p.providerName}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-foreground-muted">{p.winRate.toFixed(0)}% win · {p.tradeCount} trades</span>
                            <span className={cn("font-semibold", isPos ? "text-[hsl(var(--accent-success))]" : "text-[hsl(var(--accent-danger))]")}>
                              {isPos ? "+" : ""}${fmtUsd(p.totalPnl)}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-high overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(Math.abs(p.contribution), 100)}%`,
                              backgroundColor: isPos ? "hsl(var(--accent-success))" : "hsl(var(--accent-danger))",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Best / worst trades */}
              <Card>
                <CardHeader>
                  <h2 className="text-base font-semibold text-foreground">Best &amp; Worst Trades</h2>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.bestTrade && (
                    <div>
                      <p className="text-xs text-foreground-muted mb-1 flex items-center gap-1">
                        <Award size={12} className="text-[hsl(var(--accent-success))]" /> Best trade
                      </p>
                      <TradeRow trade={data.bestTrade} />
                    </div>
                  )}
                  {data.worstTrade && (
                    <div>
                      <p className="text-xs text-foreground-muted mb-1 flex items-center gap-1">
                        <AlertTriangle size={12} className="text-[hsl(var(--accent-danger))]" /> Worst trade
                      </p>
                      <TradeRow trade={data.worstTrade} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly returns heatmap */}
              <Card>
                <CardHeader>
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Calendar size={16} className="text-foreground-muted" />
                    Monthly Returns
                  </h2>
                </CardHeader>
                <CardContent>
                  <MonthlyHeatmap data={data.monthlyReturns} />
                </CardContent>
              </Card>

              {/* Correlation analysis */}
              <Card>
                <CardHeader>
                  <h2 className="text-base font-semibold text-foreground">Position Correlation</h2>
                  <p className="text-xs text-foreground-muted">High correlation (&gt;0.7) indicates concentrated risk.</p>
                </CardHeader>
                <CardContent>
                  <CorrelationMatrix data={data.correlationMatrix} />
                </CardContent>
              </Card>

              {/* All trades */}
              <Card>
                <CardHeader>
                  <h2 className="text-base font-semibold text-foreground">All Trades</h2>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.trades.map((t) => <TradeRow key={t.id} trade={t} />)}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </main>
    </PageTransition>
  );
}
