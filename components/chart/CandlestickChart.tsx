"use client";

import { useMemo } from "react";

interface Candle {
  open: number;
  close: number;
  high: number;
  low: number;
}

interface CandlestickChartProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

function deriveCandles(values: number[]): Candle[] {
  return values.map((v, i) => {
    const open = i === 0 ? v : values[i - 1];
    const close = v;
    const range = Math.abs(close - open);
    const wick = range * 0.3 + 0.05;
    return {
      open,
      close,
      high: Math.max(open, close) + wick,
      low: Math.min(open, close) - wick,
    };
  });
}

export function CandlestickChart({
  data,
  width = 120,
  height = 40,
  className = "",
}: CandlestickChartProps) {
  const candles = useMemo(
    () => (data.length ? deriveCandles(data) : []),
    [data]
  );

  if (!candles.length) return null;

  const allVals = candles.flatMap((c) => [c.high, c.low]);
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const range = maxVal - minVal || 1;
  const pad = 3;
  const chartW = width - pad * 2;
  const chartH = height - pad * 2;

  const toY = (v: number) => height - pad - ((v - minVal) / range) * chartH;

  const gap = 1;
  const bodyW = Math.max(2, chartW / candles.length - gap);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label="Candlestick chart"
      role="img"
      className={`overflow-visible ${className}`}
    >
      {candles.map((c, i) => {
        const cx = pad + (i / candles.length) * chartW + bodyW / 2;
        const isUp = c.close >= c.open;
        const color = isUp ? "#22c55e" : "#ef4444";
        const bodyTop = toY(Math.max(c.open, c.close));
        const bodyBottom = toY(Math.min(c.open, c.close));
        const bodyH = Math.max(1, bodyBottom - bodyTop);

        return (
          <g key={i}>
            <line
              x1={cx}
              y1={toY(c.high)}
              x2={cx}
              y2={toY(c.low)}
              stroke={color}
              strokeWidth={1}
            />
            <rect
              x={cx - bodyW / 2}
              y={bodyTop}
              width={bodyW}
              height={bodyH}
              fill={isUp ? color : "none"}
              stroke={color}
              strokeWidth={1}
            />
          </g>
        );
      })}
    </svg>
  );
}
