/**
 * Chart data classification + fallback copy.
 *
 * Issue #656: when a chart has no data or an asset does not yet have enough
 * price history, the UI should explain the situation clearly instead of leaving
 * empty boxes or broken visual states. These helpers power a single, reusable
 * <ChartFallback /> used by the line and candlestick chart components.
 */

export type ChartDataState = "empty" | "insufficient" | "ready";

export interface ChartSeriesClassification {
  state: ChartDataState;
  /** Number of usable finite numeric points after sanitization. */
  usablePoints: number;
  /** Whether any non-finite / non-numeric values were dropped. */
  hadUnsupportedValues: boolean;
}

/**
 * Classify a raw numeric series for chart rendering.
 *
 * - "empty"        → no usable points at all
 * - "insufficient" → some points, but fewer than `minPoints` (default 2),
 *                    so a trend cannot be drawn meaningfully
 * - "ready"        → enough points to render a chart
 *
 * Non-finite values (NaN, Infinity) and non-numbers are treated as unsupported
 * and excluded from the usable count, so a single bad sample can't produce a
 * broken chart.
 */
export function classifyChartSeries(
  points: number[] | null | undefined,
  opts: { minPoints?: number } = {}
): ChartSeriesClassification {
  const minPoints = opts.minPoints ?? 2;
  const safe = Array.isArray(points) ? points : [];
  const usablePoints = safe.filter(
    (v) => typeof v === "number" && Number.isFinite(v)
  ).length;
  const hadUnsupportedValues = safe.some(
    (v) => typeof v !== "number" || !Number.isFinite(v)
  );

  let state: ChartDataState;
  if (usablePoints === 0) state = "empty";
  else if (usablePoints < minPoints) state = "insufficient";
  else state = "ready";

  return { state, usablePoints, hadUnsupportedValues };
}

export interface ChartFallbackCopy {
  title: string;
  message: string;
  actionHint: string;
  /** Short inline label used inside compact placeholders. */
  inlineLabel: string;
}

/**
 * Produce clear, actionable fallback copy for an unsupported / empty chart
 * state. The copy explains *what* happened and *what the user can do next*,
 * matching the expectations described in issue #656.
 */
export function chartFallbackCopy(
  state: ChartDataState,
  opts: { assetName?: string } = {}
): ChartFallbackCopy {
  const asset = opts.assetName?.trim() ? opts.assetName.trim() : "This asset";

  if (state === "empty") {
    return {
      title: "No chart data yet",
      message: `${asset} doesn't have any price data to chart right now.`,
      actionHint: "Check back once trading activity begins and history builds up.",
      inlineLabel: "No chart data yet",
    };
  }

  if (state === "insufficient") {
    return {
      title: "Not enough history yet",
      message: `${asset} only has a little price history so far.`,
      actionHint: "Check back shortly — a bit more history is needed to draw a trend.",
      inlineLabel: "Not enough history yet",
    };
  }

  return {
    title: "Chart unavailable",
    message: `${asset} can't be charted right now.`,
    actionHint: "Try again in a moment.",
    inlineLabel: "Chart unavailable",
  };
}
