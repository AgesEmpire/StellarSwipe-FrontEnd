import { usePricePrecisionStore } from "@/store/usePricePrecisionStore";
import {
  useCurrencyStore,
  EXCHANGE_RATES,
  CURRENCY_SYMBOLS,
} from "@/store/useCurrencyStore";

/**
 * Returns a price-formatting function that respects the current precision mode
 * and the user's selected display currency.
 *
 * Usage:
 *   const fmt = usePriceFormat();
 *   fmt(0.4821)  // "$0.4821"  (compact USD) or "€0.4435" (compact EUR)
 */
export function usePriceFormat() {
  const { mode } = usePricePrecisionStore();
  const { currency } = useCurrencyStore();
  const decimals = mode === "precise" ? 8 : 4;
  const rate = EXCHANGE_RATES[currency];
  const symbol = CURRENCY_SYMBOLS[currency];

  return (value: number): string =>
    `${symbol}${(value * rate).toFixed(decimals)}`;
}
