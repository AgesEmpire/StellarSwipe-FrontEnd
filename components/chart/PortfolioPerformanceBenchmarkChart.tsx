"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { useXLMPriceHistory, type PricePoint } from "@/hooks/usePriceHistory";
import {
  computeBenchmarkSeries,
  type PortfolioValuePoint,
} from "@/lib/benchmark";
import { cn } from "@/lib/utils";

interface PortfolioPerformanceBenchmarkChartProps {
  className?: string;
}

function createSmoothPath(
  points: { x: number; y: number }[],
  height: number
): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

export function PortfolioPerformanceBenchmarkChart({
  className,
}: PortfolioPerformanceBenchmarkChartProps) {
  const { totalValue, assets } = usePortfolioStore();
  const [showBenchmark, setShowBenchmark] = useState(true);

  const xlmHistory = useXLMPriceHistory({ points: 30, interval: "day" });
  const portfolioHistory = useMemo(() => {
    const initial = assets.reduce(
      (sum, a) => sum + (a.value - (a.unrealizedPnL ?? 0)),
      0
    );
    const history: PortfolioValuePoint[] = xlmHistory.map((point, i) => ({
      timestamp: point.timestamp,
      value: initial + Math.random() * 200,
    }));
    history.push({ timestamp: Date.now(), value: totalValue });
    return history.sort((a, b) => a.timestamp - b.timestamp);
  }, [xlmHistory, totalValue, assets]);

  const { portfolio: portfolioPoints, benchmark: benchmarkPoints } =
    useMemo(() => {
      const initialPortfolioValue = portfolioHistory[0]?.value ?? totalValue;
      return computeBenchmarkSeries(
        portfolioHistory,
        xlmHistory,
        initialPortfolioValue
      );
    }, [portfolioHistory, xlmHistory, totalValue]);

  const chartData = useMemo(() => {
    if (portfolioPoints.length === 0 || benchmarkPoints.length === 0) {
      return { portfolioPath: "", benchmarkPath: "", maxVal: 0, minVal: 0 };
    }

    const width = 320;
    const height = 160;
    const padding = 20;

    const allValues = [
      ...portfolioPoints.map((p) => p.value),
      ...benchmarkPoints.map((p) => p.value),
    ];
    const maxVal = Math.max(...allValues);
    const minVal = Math.min(...allValues);
    const range = maxVal - minVal || 1;

    const portfolioPts = portfolioPoints.map((point, i) => ({
      x: (i / (portfolioPoints.length - 1)) * (width - padding * 2) + padding,
      y:
        height -
        ((point.value - minVal) / range) * (height - padding * 2) -
        padding,
    }));

    const benchmarkPts = benchmarkPoints.map((point, i) => ({
      x: (i / (benchmarkPoints.length - 1)) * (width - padding * 2) + padding,
      y:
        height -
        ((point.value - minVal) / range) * (height - padding * 2) -
        padding,
    }));

    return {
      portfolioPath: createSmoothPath(portfolioPts, height),
      benchmarkPath: createSmoothPath(benchmarkPts, height),
      maxVal,
      minVal,
      width,
      height,
    };
  }, [portfolioPoints, benchmarkPoints]);

  const performanceDelta = useMemo(() => {
    if (portfolioPoints.length === 0 || benchmarkPoints.length === 0)
      return null;

    const startPortfolio = portfolioPoints[0].value;
    const endPortfolio = portfolioPoints[portfolioPoints.length - 1].value;
    const startBenchmark = benchmarkPoints[0].value;
    const endBenchmark = benchmarkPoints[benchmarkPoints.length - 1].value;

    const portfolioReturn =
      ((endPortfolio - startPortfolio) / startPortfolio) * 100;
    const benchmarkReturn =
      ((endBenchmark - startBenchmark) / startBenchmark) * 100;

    return {
      portfolioReturn: parseFloat(portfolioReturn.toFixed(2)),
      benchmarkReturn: parseFloat(benchmarkReturn.toFixed(2)),
      outperformance: parseFloat(
        (portfolioReturn - benchmarkReturn).toFixed(2)
      ),
    };
  }, [portfolioPoints, benchmarkPoints]);

  if (assets.length === 0) {
    return null;
  }

  const outperformance = performanceDelta?.outperformance ?? 0;
  const isOutperforming = outperformance >= 0;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Portfolio Performance vs XLM Benchmark
          </h2>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showBenchmark}
              onChange={(e) => setShowBenchmark(e.target.checked)}
              className="h-3 w-3"
              aria-label="Toggle benchmark overlay"
            />
            <span className="text-foreground-muted">Show XLM benchmark</span>
          </label>
        </div>
        {performanceDelta && (
          <p className="text-xs text-foreground-muted">
            Outperformance:{" "}
            <span
              className={cn(
                isOutperforming ? "text-green-400" : "text-red-400"
              )}
            >
              {isOutperforming ? "+" : ""}
              {outperformance}%
            </span>
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="relative h-48 sm:h-56">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${chartData.width} ${chartData.height}`}
            role="img"
            aria-label="Portfolio performance chart with XLM benchmark overlay"
            className="overflow-visible"
          >
            {showBenchmark && chartData.benchmarkPath && (
              <path
                d={chartData.benchmarkPath}
                fill="none"
                stroke="#60a5fa"
                strokeWidth={2}
                strokeDasharray="4 2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {chartData.portfolioPath && (
              <path
                d={chartData.portfolioPath}
                fill="none"
                stroke="#22c55e"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {showBenchmark && (
              <text
                x={(chartData?.width ?? 0) - 40}
                y={15}
                className="fill-blue-400 text-[10px]"
                textAnchor="end"
              >
                XLM (benchmark)
              </text>
            )}
            <text
              x={(chartData?.width ?? 0) - 40}
              y={showBenchmark ? 28 : 15}
              className="fill-green-400 text-[10px]"
              textAnchor="end"
            >
              Portfolio
            </text>
          </svg>
        </div>
        {performanceDelta && (
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-foreground-muted">Portfolio return</span>
              <p
                className={cn(
                  "font-mono",
                  performanceDelta.portfolioReturn >= 0
                    ? "text-green-400"
                    : "text-red-400"
                )}
              >
                {performanceDelta.portfolioReturn >= 0 ? "+" : ""}
                {performanceDelta.portfolioReturn}%
              </p>
            </div>
            <div>
              <span className="text-foreground-muted">XLM return</span>
              <p className="font-mono text-blue-400">
                +{performanceDelta.benchmarkReturn}%
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
