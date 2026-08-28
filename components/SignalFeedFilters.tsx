"use client";

import { useMemo, useRef } from "react";
import { Bookmark, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/api";
import {
  FilterDirection,
  useSignalFilterStore,
} from "@/store/useSignalFilterStore";

const DIRECTIONS: { label: string; value: FilterDirection }[] = [
  { label: "All", value: "ALL" },
  { label: "Buy", value: "BUY" },
  { label: "Sell", value: "SELL" },
];

interface SignalFeedFiltersProps {
  /** Unique asset names derived from the current signal list */
  availableAssets?: string[];
  /** Unique provider names derived from the current signal list */
  availableProviders?: string[];
  /** Current (unfiltered) signal dataset, used to derive per-option result counts */
  signals?: Signal[];
  /** Whether the signal dataset is still loading — shows a loading state for counts */
  isLoadingCounts?: boolean;
}

/** Small badge that renders a per-option result count with distinct loading/empty/unavailable states */
function CountBadge({ count, isLoading }: { count: number | null; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <span
        className="ml-1.5 inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent align-middle opacity-60"
        aria-hidden="true"
      />
    );
  }
  if (count === null) {
    return (
      <span className="ml-1 text-[10px] opacity-40" aria-hidden="true">
        &ndash;
      </span>
    );
  }
  return (
    <span className={cn("ml-1 text-[10px] tabular-nums", count === 0 ? "opacity-40" : "opacity-80")}>
      ({count})
    </span>
  );
}

const MAX_QUICK_FILTERS = 4;

export function SignalFeedFilters({
  availableAssets = [],
  availableProviders = [],
  signals,
  isLoadingCounts = false,
}: SignalFeedFiltersProps) {
  const {
    direction,
    asset,
    provider,
    bookmarkedOnly,
    setDirection,
    setAsset,
    setProvider,
    setBookmarkedOnly,
    reset,
  } = useSignalFilterStore();
  const assetInputRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => {
    if (!signals) return null;
    return {
      direction: (value: FilterDirection) =>
        value === "ALL" ? signals.length : signals.filter((s) => s.action === value).length,
      asset: (value: string) => signals.filter((s) => s.asset === value).length,
      provider: (value: string) => signals.filter((s) => s.providerId === value).length,
    };
  }, [signals]);

  const isActive =
    direction !== "ALL" || asset !== "" || provider !== "" || bookmarkedOnly;

  const quickAssets = availableAssets.slice(0, MAX_QUICK_FILTERS);
  const quickProviders = availableProviders.slice(0, MAX_QUICK_FILTERS);

  return (
    <section
      aria-label="Signal feed filters"
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 sm:p-4"
    >
      {/* Title row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-foreground-muted uppercase tracking-wide">
          <SlidersHorizontal size={13} aria-hidden="true" />
          Filters
        </span>
        {isActive && (
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
            aria-label="Clear all filters"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
          aria-pressed={bookmarkedOnly}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            bookmarkedOnly
              ? "bg-sky-500/15 text-sky-300 border border-sky-500/40"
              : "bg-white/5 text-gray-300 border border-white/10 hover:border-white/20 hover:text-gray-200"
          )}
        >
          <Bookmark size={14} aria-hidden="true" />
          Bookmarked
        </button>

        {quickAssets.map((assetLabel) => {
          const count = counts ? counts.asset(assetLabel) : null;
          return (
            <button
              key={assetLabel}
              type="button"
              onClick={() => setAsset(asset === assetLabel ? "" : assetLabel)}
              aria-pressed={asset === assetLabel}
              aria-label={`Filter by asset ${assetLabel}${count !== null ? `, ${count} results` : ""}`}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                asset === assetLabel
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                  : "bg-surface text-foreground border border-border hover:border-border-strong hover:text-foreground"
              )}
            >
              {assetLabel}
              <CountBadge count={count} isLoading={isLoadingCounts} />
            </button>
          );
        })}

        {quickProviders.map((providerLabel) => {
          const count = counts ? counts.provider(providerLabel) : null;
          return (
            <button
              key={providerLabel}
              type="button"
              onClick={() => setProvider(provider === providerLabel ? "" : providerLabel)}
              aria-pressed={provider === providerLabel}
              aria-label={`Filter by provider ${providerLabel}${count !== null ? `, ${count} results` : ""}`}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                provider === providerLabel
                  ? "bg-orange-500/15 text-orange-300 border border-orange-500/40"
                  : "bg-surface text-foreground border border-border hover:border-border-strong hover:text-foreground"
              )}
            >
              {providerLabel}
              <CountBadge count={count} isLoading={isLoadingCounts} />
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Direction pills */}
        <fieldset className="flex items-center gap-1" aria-label="Filter by direction">
          {DIRECTIONS.map(({ label, value }) => {
            const count = counts ? counts.direction(value) : null;
            return (
              <button
                key={value}
                onClick={() => setDirection(value)}
                aria-pressed={direction === value}
                aria-label={`Filter by direction ${label}${count !== null ? `, ${count} results` : ""}`}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  direction === value
                    ? value === "BUY"
                      ? "bg-green-500/20 text-green-400 border border-green-500/40"
                      : value === "SELL"
                      ? "bg-red-500/20 text-red-400 border border-red-500/40"
                      : "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                    : "bg-surface text-foreground-muted border border-border hover:border-border-strong hover:text-foreground"
                )}
              >
                {label}
                <CountBadge count={count} isLoading={isLoadingCounts} />
              </button>
            );
          })}
        </fieldset>

        {/* Asset filter */}
        <div className="relative flex items-center">
          {availableAssets.length > 0 ? (
            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              aria-label="Filter by asset"
              className="appearance-none rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-white/20 transition-colors pr-6"
            >
              <option value="">All assets{counts ? ` (${counts.direction("ALL")})` : ""}</option>
              {availableAssets.map((a) => (
                <option key={a} value={a}>
                  {a}
                  {counts ? ` (${counts.asset(a)})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <div className="relative">
              <input
                ref={assetInputRef}
                type="text"
                value={asset}
                onChange={(e) => setAsset(e.target.value.toUpperCase())}
                placeholder="Asset (e.g. XLM)"
                aria-label="Filter by asset"
                maxLength={10}
                className="rounded-full bg-surface border border-border px-3 py-1 text-xs text-foreground placeholder-foreground-subtle focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-border-strong transition-colors w-32"
              />
              {asset && (
                <button
                  onClick={() => {
                    setAsset("");
                    assetInputRef.current?.focus();
                  }}
                  aria-label="Clear asset filter"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          )}
        </div>

        {availableProviders.length > 0 && (
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            aria-label="Filter by provider"
            className="appearance-none rounded-full bg-surface border border-border px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-border-strong transition-colors"
          >
            <option value="">All providers</option>
            {availableProviders.map((p) => (
              <option key={p} value={p}>
                {p}
                {counts ? ` (${counts.provider(p)})` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Active filter summary */}
      {isActive && (
        <p className="text-[11px] text-gray-500" aria-live="polite">
          Showing: {[
            direction !== "ALL" && `Direction: ${direction}`,
            asset && `Asset: ${asset}`,
            provider && `Provider: ${provider}`,
            bookmarkedOnly && `Bookmarked only`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </section>
  );
}
