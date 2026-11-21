"use client";

import type { ChartDataState } from "@/lib/chartState";
import { chartFallbackCopy } from "@/lib/chartState";
import { cn } from "@/lib/utils";

interface ChartFallbackProps {
  /** Why the chart can't render right now. */
  state: ChartDataState;
  /** Optional asset name to personalize the message (e.g. "XLM/USDC"). */
  assetName?: string;
  /**
   * Compact mode mirrors the inline sparkline placeholder (single line, fixed
   * height) so it can drop into small chart footprints without shifting layout.
   */
  compact?: boolean;
  className?: string;
  height?: number | string;
}

/**
 * Reusable fallback shown by chart components when there is no data or not
 * enough history to draw a trend (issue #656). Renders a clear, accessible
 * explanation and a next-step hint instead of an empty / broken box, and matches
 * the existing chart placeholder styling.
 */
export function ChartFallback({
  state,
  assetName,
  compact = false,
  className = "",
  height,
}: ChartFallbackProps) {
  const copy = chartFallbackCopy(state, { assetName });
  const style = height !== undefined ? { height } : undefined;

  return (
    <div
      role="status"
      aria-label={compact ? copy.inlineLabel : `${copy.title}. ${copy.message} ${copy.actionHint}`}
      data-testid="chart-unavailable-placeholder"
      className={cn(
        "flex items-center justify-center rounded-md border border-dashed border-white/10 bg-white/5 px-2 text-center text-foreground-muted",
        compact ? "h-10 text-[11px]" : "min-h-[80px] flex-col gap-1 p-4 text-sm",
        className
      )}
      style={style}
    >
      {compact ? (
        <span aria-hidden="true">{copy.inlineLabel}</span>
      ) : (
        <div className="max-w-xs">
          <p className="font-medium text-foreground">{copy.title}</p>
          <p className="mt-1">{copy.message}</p>
          <p className="mt-1 text-xs text-foreground-muted/80">{copy.actionHint}</p>
        </div>
      )}
    </div>
  );
}
