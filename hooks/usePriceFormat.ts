import { usePricePrecisionStore } from "@/store/usePricePrecisionStore";

/**
 * Returns a price-formatting function that respects the current precision mode.
 *
 * Usage:
 *   const fmt = usePriceFormat();
 *   fmt(0.4821)  // "$0.4821"  (compact) or "$0.48210000" (precise)
 */
export function usePriceFormat() {
  const { mode } = usePricePrecisionStore();
  const decimals = mode === "precise" ? 8 : 4;

  return (value: number, prefix = "$"): string =>
    `${prefix}${value.toFixed(decimals)}`;
}
