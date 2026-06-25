import { usePricePrecisionStore } from "@/store/usePricePrecisionStore";
import { getCurrentLocale, LOCALE_BCP47 } from "@/lib/i18n";

/**
 * Returns a locale-aware price-formatting function that respects the current
 * precision mode and the active locale's decimal/thousands separators.
 *
 * Usage:
 *   const fmt = usePriceFormat();
 *   fmt(0.4821)  // "$0.4821" (compact) or "$0.48210000" (precise)
 */
export function usePriceFormat() {
  const { mode } = usePricePrecisionStore();
  const decimals = mode === "precise" ? 8 : 4;
  const locale = LOCALE_BCP47[getCurrentLocale()];

  return (value: number, currency = "USD"): string =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
}
