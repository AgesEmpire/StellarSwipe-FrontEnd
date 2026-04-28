"use client";

import { useMemo } from "react";

interface MiniChartProps {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  showArea?: boolean;
  className?: string;
}

function createSmoothPath(points: { x: number; y: number }[]): string {
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

function createAreaPath(points: { x: number; y: number }[], height: number): string {
  const linePath = createSmoothPath(points);
  if (!linePath) return "";

  const firstX = points[0].x;
  const lastX = points[points.length - 1].x;

  return `${linePath} L ${lastX} ${height} L ${firstX} ${height} Z`;
}

export function MiniChart({
  data,
  width = 120,
  height = 40,
  strokeWidth = 2,
  showArea = true,
  className = "",
}: MiniChartProps) {
  const { path, areaPath, isPositive, gradientId } = useMemo(() => {
    if (!data.length) return { path: "", areaPath: "", isPositive: true, gradientId: "" };

    const values = data;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padding = 2;

    const points = values.map((value, i) => ({
      x: (i / (values.length - 1)) * (width - padding * 2) + padding,
      y: height - ((value - min) / range) * (height - padding * 2) - padding,
    }));

    const linePath = createSmoothPath(points);
    const areaPathVal = showArea ? createAreaPath(points, height) : "";
    const positive = values[values.length - 1] >= values[0];
    const id = `mini-chart-gradient-${Math.random().toString(36).slice(2, 9)}`;

    return { path: linePath, areaPath: areaPathVal, isPositive: positive, gradientId: id };
  }, [data, width, height, showArea]);

  if (!data.length) return null;

  const lineColor = isPositive ? "#22c55e" : "#ef4444";
  const areaOpacity = isPositive ? 0.15 : 0.1;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={`Mini chart showing ${isPositive ? "positive" : "negative"} trend`}
      role="img"
      className={`overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity={areaOpacity} />
          <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
        </linearGradient>
      </defs>

      {showArea && areaPath && (
        <path d={areaPath} fill={`url(#${gradientId})`} />
      )}

      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
