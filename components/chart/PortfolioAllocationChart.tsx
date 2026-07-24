"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { cn } from "@/lib/utils";

interface PortfolioAllocationChartProps {
  className?: string;
  width?: number;
  height?: number;
}

export function PortfolioAllocationChart({
  className,
  width = 200,
  height = 200,
}: PortfolioAllocationChartProps) {
  const { assets, totalValue, isLoading } = usePortfolioStore();

  const chartData = useMemo(() => {
    return assets.map((asset) => ({
      ...asset,
      percentage: asset.percentage,
    }));
  }, [assets]);

  const arcs = useMemo(() => {
    if (chartData.length === 0) return [];

    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 10;
    const innerRadius = outerRadius * 0.4;

    let cumulativeAngle = 0;

    return chartData.map((asset, index) => {
      const angle = (asset.percentage / 100) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      const midAngle = startAngle + angle / 2;

      const startX =
        centerX + outerRadius * Math.cos(((startAngle - 90) * Math.PI) / 180);
      const startY =
        centerY + outerRadius * Math.sin(((startAngle - 90) * Math.PI) / 180);
      const endX =
        centerX + outerRadius * Math.cos(((endAngle - 90) * Math.PI) / 180);
      const endY =
        centerY + outerRadius * Math.sin(((endAngle - 90) * Math.PI) / 180);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const path = [
        `M ${startX} ${startY}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      ];

      const innerEndX =
        centerX + innerRadius * Math.cos(((endAngle - 90) * Math.PI) / 180);
      const innerEndY =
        centerY + innerRadius * Math.sin(((endAngle - 90) * Math.PI) / 180);
      const innerStartX =
        centerX + innerRadius * Math.cos(((startAngle - 90) * Math.PI) / 180);
      const innerStartY =
        centerY + innerRadius * Math.sin(((startAngle - 90) * Math.PI) / 180);

      path.push(`L ${innerEndX} ${innerEndY}`);
      path.push(
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}`
      );
      path.push("Z");

      // Position label at the middle of the arc
      const labelRadius = (outerRadius + innerRadius) / 2;
      const labelX =
        centerX + labelRadius * Math.cos(((midAngle - 90) * Math.PI) / 180);
      const labelY =
        centerY + labelRadius * Math.sin(((midAngle - 90) * Math.PI) / 180);

      cumulativeAngle = endAngle;

      return {
        path: path.join(" "),
        color: asset.color,
        percentage: asset.percentage,
        symbol: asset.symbol,
        name: asset.name,
        value: asset.value,
        labelX,
        labelY,
      };
    });
  }, [chartData, width, height]);

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">
            Portfolio Allocation
          </h2>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Loading portfolio data...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (assets.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">
            Portfolio Allocation
          </h2>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No portfolio data available"
            description="Connect assets or complete a trade to populate allocation data."
            className="h-48 rounded-xl bg-transparent py-6"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <h2 className="text-base font-semibold text-foreground">
          Portfolio Allocation
        </h2>
        <p className="text-xs text-muted-foreground">
          Total value: ${totalValue.toLocaleString()}
        </p>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-48 sm:h-56">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Portfolio allocation donut chart"
          >
            {arcs.map((arc) => (
              <g key={arc.symbol}>
                <path
                  d={arc.path}
                  fill={arc.color}
                  className="transition-opacity hover:opacity-80"
                >
                  <title>{`${arc.name}: ${arc.percentage.toFixed(1)}%`}</title>
                </path>
                {arc.percentage > 5 && (
                  <text
                    x={arc.labelX}
                    y={arc.labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-white text-xs font-medium"
                    style={{ fontSize: "10px", pointerEvents: "none" }}
                  >
                    {`${arc.percentage.toFixed(0)}%`}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>

        <ul
          className="mt-4 space-y-2"
          aria-label="Portfolio allocation breakdown"
        >
          {assets.map((asset) => (
            <li
              key={asset.symbol}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: asset.color }}
                  aria-hidden="true"
                />
                <span className="text-foreground">{asset.name}</span>
              </div>
              <span className="font-mono text-foreground-muted">
                {asset.percentage.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
