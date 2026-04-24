"use client";

import { useState, useCallback } from "react";

interface UseStopLossOptions {
  /** Initial stop-loss percentage. Default: 5 */
  initialValue?: number;
  /** Entry price of the asset being traded */
  entryPrice?: number;
}

interface UseStopLossReturn {
  /** Current stop-loss percentage (0–100) */
  stopLossPercent: number;
  /** Derived stop-loss price, or null if no entryPrice provided */
  stopLossPrice: number | null;
  /** Update the stop-loss percentage */
  setStopLossPercent: (value: number) => void;
  /** Reset to the initial value */
  reset: () => void;
}

/**
 * useStopLoss — manages stop-loss percentage state and derives the
 * corresponding price from an optional entry price.
 *
 * The value persists in component state for the lifetime of the parent
 * (e.g. while a trade-setup modal is open).
 */
export function useStopLoss(
  options: UseStopLossOptions = {}
): UseStopLossReturn {
  const { initialValue = 5, entryPrice } = options;

  const [stopLossPercent, setStopLossPercent] = useState<number>(initialValue);

  const stopLossPrice =
    entryPrice != null
      ? entryPrice * (1 - stopLossPercent / 100)
      : null;

  const reset = useCallback(() => {
    setStopLossPercent(initialValue);
  }, [initialValue]);

  return {
    stopLossPercent,
    stopLossPrice,
    setStopLossPercent,
    reset,
  };
}
