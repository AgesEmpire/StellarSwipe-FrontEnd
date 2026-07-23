"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { InfiniteData } from "@tanstack/query-core";
import { Button } from "@/components/ui/button";
import { SignalEmptyState } from "@/components/SignalEmptyState";
import { SignalCardSkeleton } from "@/components/SignalCardSkeleton";
import { SignalFeedFilters } from "@/components/SignalFeedFilters";
import { SignalSortControls } from "@/components/SignalSortControls";
import { SignalFilterBottomSheet } from "@/components/SignalFilterBottomSheet";
import { PricePrecisionToggle } from "@/components/PricePrecisionToggle";
import { FeedDensityToggle } from "@/components/FeedDensityToggle";
import { useFeedDensityStore } from "@/store/useFeedDensityStore";
import { ExpiredSignalBanner } from "@/components/ExpiredSignalBanner";
import { useSignalFilterStore } from "@/store/useSignalFilterStore";
import { useBookmarkStore } from "@/store/useBookmarkStore";
import { useRecentlyViewedStore } from "@/store/useRecentlyViewedStore";
import { useSnoozeStore, selectVisibleSignals } from "@/store/useSnoozeStore";
import { RecentlyViewedStrip } from "@/components/RecentlyViewedStrip";
import type { Signal } from "@/lib/signals";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { RelativeTimestamp } from "@/components/RelativeTimestamp";
import { queryOptions as queryOpts } from "@/lib/queryOptions";
import { fetchSignals } from "@/lib/api";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import {
  computeSplitRatioFromClientX,
  persistSplitRatio,
  readPersistedSplitRatio,
} from "@/lib/splitView";

interface SignalResponse {
  items: Signal[];
  page: number;
  pageSize: number;
  nextPage: number | null;
  hasMore: boolean;
}

const PAGE_SIZE = 10;
const DESKTOP_BREAKPOINT = "(min-width: 1024px)";
const MIN_LIST_PANE_WIDTH = 320;
const MIN_DETAIL_PANE_WIDTH = 340;

interface SignalFeedProps {
  /** Server-fetched first page — eliminates the client waterfall on initial load */
  initialData?: SignalResponse;
}

export function SignalFeed({ initialData }: SignalFeedProps = {}) {
  const feedRef = useRef<HTMLDivElement | null>(null);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);

  // #99: provider search state (persisted in filter store)
  const { direction, asset, provider, bookmarkedOnly, sortOrder, setProvider } =
    useSignalFilterStore();
  const density = useFeedDensityStore((s) => s.density);
  const bookmarkedIds = useBookmarkStore((state) => state.bookmarks);
  // #321: snoozed signals are hidden from the feed until their snooze elapses.
  const snoozedMap = useSnoozeStore((state) => state.snoozed);
  const pruneExpiredSnoozes = useSnoozeStore((state) => state.pruneExpired);
  const [providerSearch, setProviderSearch] = useState(provider);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const { addView } = useRecentlyViewedStore();
  // Bumped on a timer so expired snoozes are re-evaluated and signals return.
  const [snoozeTick, setSnoozeTick] = useState(0);

  // Track whether the last auto-load attempt failed so we can show the manual fallback
  const [autoLoadFailed, setAutoLoadFailed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    refetch,
  } = useInfiniteQuery<
    SignalResponse,
    Error,
    InfiniteData<SignalResponse, number>
  >({
    queryKey: ["signals"],
    queryFn: async ({ pageParam = 1 }) => {
      // Use fetchSignals so absolute base URL is prepended correctly for MSW testing environments
      return fetchSignals({
        page: pageParam as number,
        pageSize: PAGE_SIZE,
      }) as Promise<SignalResponse>;
    },
    getNextPageParam: (lastPage: SignalResponse) => lastPage.nextPage,
    initialPageParam: 1,
    staleTime: queryOpts.signal.staleTime,
    placeholderData: (prev) => prev,
    // Seed the cache with the server-fetched first page so no client waterfall occurs
    ...(initialData && {
      initialData: {
        pages: [initialData],
        pageParams: [1],
      },
    }),
  });

  const allSignals = useMemo<Signal[]>(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  const availableProviders = useMemo(
    () => [...new Set(allSignals.map((s) => s.ticker))].sort(),
    [allSignals]
  );

  const availableAssets = useMemo(
    () => [...new Set(allSignals.map((s) => s.ticker))].sort(),
    [allSignals]
  );

  const filteredSignals = useMemo<Signal[]>(() => {
    let filtered = [...allSignals];
    const searchTerm = providerSearch.trim().toLowerCase();

    if (direction !== "ALL") {
      filtered = filtered.filter((s) => s.action === direction);
    }

    if (asset.trim()) {
      const query = asset.trim().toLowerCase();
      filtered = filtered.filter((s) => s.ticker.toLowerCase().includes(query));
    }

    if (provider.trim()) {
      const query = provider.trim().toLowerCase();
      filtered = filtered.filter((s) => s.ticker.toLowerCase().includes(query));
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.ticker.toLowerCase().includes(searchTerm) ||
          s.details.toLowerCase().includes(searchTerm) ||
          s.action.toLowerCase().includes(searchTerm)
      );
    }

    if (bookmarkedOnly) {
      filtered = filtered.filter((s) => bookmarkedIds.includes(s.id));
    }

    // #321: hide signals that are currently snoozed; they re-appear once the
    // snooze expires (snoozeTick forces this to re-run periodically).
    filtered = selectVisibleSignals(filtered, snoozedMap);

    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    allSignals,
    direction,
    asset,
    provider,
    providerSearch,
    bookmarkedOnly,
    bookmarkedIds,
    snoozedMap,
    snoozeTick,
  ]);

  const signals = useMemo<Signal[]>(() => {
    const copy = [...filteredSignals];
    if (sortOrder === "latest") {
      copy.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } else if (sortOrder === "hot") {
      // Best Performing: newest signals with highest confidence
      copy.sort(
        (a, b) =>
          b.confidence - a.confidence ||
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } else if (sortOrder === "confidence") {
      // Confidence: strictly by confidence score descending
      copy.sort((a, b) => b.confidence - a.confidence);
    } else if (sortOrder === "relevant") {
      // Relevant: BUY/SELL before HOLD, then by confidence
      const actionWeight = (s: Signal) => (s.action === "HOLD" ? 0 : 1);
      copy.sort(
        (a, b) =>
          actionWeight(b) - actionWeight(a) || b.confidence - a.confidence
      );
    }
    return copy;
  }, [filteredSignals, sortOrder]);

  const selectedSignal = useMemo(
    () => signals.find((signal) => signal.id === selectedSignalId) ?? null,
    [signals, selectedSignalId]
  );

  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  // Virtual row configuration - estimate height based on typical signal card
  const estimatedRowHeight = 280;

  const virtualizer = useVirtualizer({
    count: signals.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => estimatedRowHeight,
    overscan: 3,
    scrollMargin: 100,
  });

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const syncStatus = useSyncStatus(isFetching);

  // Pull-to-refresh gesture handler
  const handlePullRefresh = useCallback(() => {
    // Refetch the first page when pull-to-refresh is triggered
    refetch();
  }, [refetch]);

  const { pullDistance, isRefreshing } = usePullToRefresh({
    container: scrollEl,
    onRefresh: handlePullRefresh,
    disabled: isLoading, // Disable while initial load is in flight
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(DESKTOP_BREAKPOINT);
    const updateDesktopMode = () => setIsDesktop(mediaQuery.matches);

    setSplitRatio(readPersistedSplitRatio(window.localStorage));
    updateDesktopMode();
    mediaQuery.addEventListener("change", updateDesktopMode);

    return () => {
      mediaQuery.removeEventListener("change", updateDesktopMode);
    };
  }, []);

  useEffect(() => {
    if (!signals.length) {
      setSelectedSignalId(null);
      return;
    }

    if (
      !selectedSignalId ||
      !signals.some((signal) => signal.id === selectedSignalId)
    ) {
      setSelectedSignalId(signals[0]!.id);
    }
  }, [signals, selectedSignalId]);

  const updateSplitRatio = useCallback((nextRatio: number) => {
    setSplitRatio(nextRatio);
    if (typeof window !== "undefined") {
      persistSplitRatio(window.localStorage, nextRatio);
    }
  }, []);

  const handleSplitDragStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!splitContainerRef.current) return;

      event.preventDefault();
      const container = splitContainerRef.current;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        const nextRatio = computeSplitRatioFromClientX(
          moveEvent.clientX,
          rect.left,
          rect.width,
          MIN_LIST_PANE_WIDTH,
          MIN_DETAIL_PANE_WIDTH
        );
        updateSplitRatio(nextRatio);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [updateSplitRatio]
  );

  const handleSplitHandleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      event.preventDefault();
      const delta = event.key === "ArrowLeft" ? -0.03 : 0.03;
      updateSplitRatio(splitRatio + delta);
    },
    [splitRatio, updateSplitRatio]
  );

  // Custom scroll restoration for the virtualized container
  useEffect(() => {
    const container = parentRef.current;
    if (!container) return;

    // Restore scroll position from sessionStorage
    const STORAGE_KEY = "signal-feed-scroll-position";
    try {
      const savedPosition = sessionStorage.getItem(STORAGE_KEY);
      if (savedPosition) {
        const position = parseInt(savedPosition, 10);
        container.scrollTop = position;
      }
    } catch (e) {
      // Ignore storage errors
    }

    // Save scroll position on unmount
    const handleScroll = () => {
      try {
        sessionStorage.setItem(STORAGE_KEY, container.scrollTop.toString());
      } catch (e) {
        // Ignore storage errors
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      // Save final position on unmount
      try {
        sessionStorage.setItem(STORAGE_KEY, container.scrollTop.toString());
      } catch (e) {
        // Ignore storage errors
      }
    };
  }, []);

  // #321: periodically drop expired snoozes so snoozed signals are
  // automatically returned to the feed once their snooze period elapses.
  useEffect(() => {
    const interval = setInterval(() => {
      pruneExpiredSnoozes();
      setSnoozeTick((tick) => tick + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [pruneExpiredSnoozes]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      setAutoLoadFailed(false);
      fetchNextPage().catch(() => setAutoLoadFailed(true));
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Manual fallback: called from the button when auto-scroll failed
  const handleManualLoadMore = useCallback(() => {
    setAutoLoadFailed(false);
    fetchNextPage().catch(() => setAutoLoadFailed(true));
  }, [fetchNextPage]);

  useEffect(() => {
    const element = sentinelRef.current;
    // If auto-load previously failed, don't re-trigger via IntersectionObserver
    if (!element || !hasNextPage || isFetchingNextPage || autoLoadFailed)
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "240px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, loadMore, autoLoadFailed]);

  // #99: sync provider search to filter store
  const handleProviderSearch = useCallback(
    (value: string) => {
      setProviderSearch(value);
      setProvider(value);
    },
    [setProvider]
  );

  return (
    <section
      ref={feedRef}
      aria-label="Signal feed"
      className="rounded-3xl border border-white/10 bg-slate-950/80 p-4 shadow-xl shadow-slate-950/10 sm:p-6"
    >
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-400/90">
            Signal feed
          </p>
          <h2 className="text-xl font-semibold sm:text-2xl md:text-3xl">
            Live market signals
          </h2>
          <p className="max-w-2xl text-sm text-slate-400">
            Browse the latest actionable signals with seamless infinite
            scrolling.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* Sort controls — persistent across browsing */}
          <SignalSortControls />
          <div className="flex items-center gap-2">
            {/* Price precision toggle */}
            <PricePrecisionToggle />
            {/* Density toggle — persisted across sessions */}
            <FeedDensityToggle />
          </div>
          {/* #98: show consistent loading state */}
          <div
            className="text-right text-sm text-foreground-muted"
            aria-live="polite"
            aria-atomic="true"
          >
            {isFetching && !allSignals.length
              ? "Loading signals..."
              : isFetching
              ? "Refreshing..."
              : "Scroll down to load more."}
          </div>
        </div>
      </div>

      {/* #99: Provider search input */}
      <div className="mb-4">
        <div className="relative flex items-center">
          <Search
            size={14}
            className="absolute left-3 text-slate-500 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={providerSearch}
            onChange={(e) => handleProviderSearch(e.target.value)}
            placeholder="Search provider / ticker…"
            aria-label="Search signals by provider or ticker"
            className="w-full rounded-full bg-white/5 border border-white/10 pl-8 pr-8 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-white/20 transition-colors"
          />
          {providerSearch && (
            <button
              onClick={() => handleProviderSearch("")}
              aria-label="Clear provider search"
              className="absolute right-3 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {/* #99: show matching provider count */}
        {providerSearch && (
          <p className="mt-1 text-[11px] text-slate-500" aria-live="polite">
            {signals.length} signal{signals.length !== 1 ? "s" : ""} matching
            &ldquo;{providerSearch}&rdquo;
          </p>
        )}
      </div>

      {/* Filters — desktop: inline panel; mobile: bottom sheet trigger */}
      <div className="mb-4">
        {/* Mobile filter trigger button */}
        <div className="flex items-center gap-2 sm:hidden mb-3">
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            aria-label="Open signal filters"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-white/20 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <SlidersHorizontal size={13} aria-hidden="true" />
            Filters
            {(direction !== "ALL" ||
              asset !== "" ||
              provider !== "" ||
              bookmarkedOnly ||
              providerSearch.trim() !== "") && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">
                {
                  [
                    direction !== "ALL",
                    asset !== "",
                    provider !== "",
                    bookmarkedOnly,
                    providerSearch.trim() !== "",
                  ].filter(Boolean).length
                }
              </span>
            )}
          </button>
        </div>

        {/* Desktop: inline filter panel */}
        <div className="hidden sm:block">
          <SignalFeedFilters
            availableAssets={availableAssets}
            availableProviders={availableProviders}
          />
        </div>
      </div>

      {/* Recently Viewed Strip */}
      <RecentlyViewedStrip />

      {/* Mobile bottom sheet */}
      <SignalFilterBottomSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        availableProviders={availableProviders}
        availableMarkets={availableAssets}
      />

      {/* Pull-to-refresh indicator — visible on touch devices only */}
      <div className="sm:hidden" data-testid="pull-to-refresh-container">
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
        />
      </div>

      <div
        ref={splitContainerRef}
        className="lg:grid lg:items-start lg:gap-0"
        style={
          isDesktop
            ? {
                gridTemplateColumns: `${(splitRatio * 100).toFixed(
                  2
                )}% 10px minmax(${MIN_DETAIL_PANE_WIDTH}px, 1fr)`,
              }
            : undefined
        }
      >
        <div className="min-w-0">
          <div
            ref={setScrollEl}
            className="max-h-[70vh] overflow-auto"
            role="feed"
            aria-busy={isLoading}
            aria-label="Signal list"
            onKeyDown={(e) => {
              if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
              const articles = Array.from(
                (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
                  "article[tabindex]"
                )
              );
              const idx = articles.indexOf(
                document.activeElement as HTMLElement
              );
              if (idx === -1) return;
              e.preventDefault();
              const next =
                e.key === "ArrowDown" ? articles[idx + 1] : articles[idx - 1];
              next?.focus();
            }}
          >
            {isLoading ? (
              <div
                className="space-y-4"
                role="status"
                aria-label="Loading signal feed"
                aria-live="polite"
              >
                <span className="sr-only">Loading signal feed…</span>
                {Array.from({ length: 3 }).map((_, index) => (
                  <SignalCardSkeleton key={index} />
                ))}
              </div>
            ) : !isError && signals.length === 0 ? (
              <SignalEmptyState
                variant={
                  direction !== "ALL" ||
                  asset.trim() !== "" ||
                  provider.trim() !== "" ||
                  bookmarkedOnly ||
                  providerSearch.trim() !== ""
                    ? "no-results"
                    : "no-signals"
                }
                onRefresh={() => refetch()}
              />
            ) : (
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const signal = signals[virtualRow.index];
                  const isExpired =
                    !!signal.expiresAt &&
                    new Date(signal.expiresAt) < new Date();

                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <article
                        tabIndex={0}
                        onClick={() => {
                          addView(signal.id);
                          setSelectedSignalId(signal.id);
                        }}
                        aria-label={`${signal.ticker} ${
                          signal.action
                        } signal, ${signal.confidence}% confidence${
                          signal.provider ? `, provider ${signal.provider}` : ""
                        }${signal.status ? `, status ${signal.status}` : ""}${
                          isExpired ? ", expired" : ""
                        }. Use arrow keys to navigate between signals.`}
                        data-density={density}
                        className={`rounded-3xl border border-white/10 bg-slate-950/90 shadow-sm shadow-slate-950/20 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                          density === "compact"
                            ? "p-2 sm:p-3 mb-2"
                            : "p-4 sm:p-6 mb-4"
                        }`}
                      >
                        {isExpired && (
                          <div className="mb-3">
                            <ExpiredSignalBanner onRefresh={() => refetch()} />
                          </div>
                        )}

                        <div
                          className={
                            isExpired
                              ? "opacity-60 pointer-events-none select-none"
                              : ""
                          }
                          aria-hidden={isExpired}
                        >
                          <div
                            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${
                              density === "compact" ? "gap-2" : "gap-4"
                            }`}
                          >
                            <div>
                              <p className="text-xs uppercase tracking-[0.3em] text-foreground-muted">
                                <time dateTime={signal.timestamp}>
                                  <RelativeTimestamp
                                    timestamp={new Date(signal.timestamp)}
                                  />
                                </time>
                              </p>
                              <h3 className="mt-2 text-base font-semibold tracking-tight text-white sm:text-xl">
                                {signal.ticker} • {signal.action}
                              </h3>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {signal.provider && (
                                  <span
                                    className="inline-flex items-center rounded-md bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-300 ring-1 ring-inset ring-sky-500/20"
                                    aria-label={`Provider: ${signal.provider}`}
                                  >
                                    {signal.provider}
                                  </span>
                                )}
                                {signal.status && (
                                  <span
                                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                                      signal.status === "Active"
                                        ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
                                        : signal.status === "Waiting"
                                        ? "bg-amber-500/10 text-amber-300 ring-amber-500/20"
                                        : "bg-slate-500/10 text-slate-400 ring-slate-500/20"
                                    }`}
                                    aria-label={`Status: ${signal.status}`}
                                  >
                                    {signal.status}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-sky-300 sm:px-4 sm:py-2 sm:text-sm"
                              aria-label={`Confidence: ${signal.confidence} percent`}
                            >
                              Confidence {signal.confidence}%
                            </div>
                          </div>
                          <p
                            className={`text-sm leading-6 text-foreground-muted ${
                              density === "compact" ? "mt-2" : "mt-4"
                            }`}
                          >
                            {signal.details}
                          </p>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
            )}

            {!isLoading && isFetchingNextPage && (
              <div aria-hidden="true">
                <SignalCardSkeleton />
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col items-center gap-4">
            {isFetchingNextPage && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground-muted"
              >
                Loading more signals...
              </div>
            )}

            {!hasNextPage && signals.length > 0 && (
              <p
                className="text-center text-sm text-foreground-subtle"
                aria-live="polite"
              >
                You&apos;ve reached the end of the feed.
              </p>
            )}

            {hasNextPage && (autoLoadFailed || !isFetchingNextPage) && (
              <div className="flex flex-col items-center gap-2">
                {autoLoadFailed && (
                  <p
                    className="text-xs text-amber-400"
                    role="alert"
                    aria-live="assertive"
                  >
                    Auto-load failed. Load more manually.
                  </p>
                )}
                <Button
                  variant="outline"
                  onClick={handleManualLoadMore}
                  disabled={isFetchingNextPage}
                  aria-label={
                    isFetchingNextPage
                      ? "Loading more signals"
                      : "Load more signals"
                  }
                >
                  {isFetchingNextPage ? "Loading more..." : "Load more signals"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {isDesktop && (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize feed and detail panes"
              tabIndex={0}
              onMouseDown={handleSplitDragStart}
              onKeyDown={handleSplitHandleKeyDown}
              className="mx-1 hidden h-full min-h-[70vh] cursor-col-resize rounded-full border border-white/10 bg-white/5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 lg:block"
            />
            <aside
              aria-label="Selected signal details"
              className="hidden min-h-[70vh] rounded-2xl border border-white/10 bg-slate-950/70 p-4 lg:block"
            >
              {selectedSignal ? (
                <div className="space-y-4" tabIndex={0}>
                  <p className="text-xs uppercase tracking-[0.3em] text-sky-400/80">
                    Selected signal
                  </p>
                  <h3 className="text-2xl font-semibold text-white">
                    {selectedSignal.ticker} • {selectedSignal.action}
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-sky-300">
                      Confidence {selectedSignal.confidence}%
                    </span>
                    {selectedSignal.provider && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-foreground-muted">
                        Provider: {selectedSignal.provider}
                      </span>
                    )}
                    {selectedSignal.status && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-foreground-muted">
                        Status: {selectedSignal.status}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-6 text-foreground-muted">
                    {selectedSignal.details}
                  </p>
                  <p className="text-xs text-foreground-subtle">
                    Published{" "}
                    <RelativeTimestamp
                      timestamp={new Date(selectedSignal.timestamp)}
                    />
                    .
                  </p>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-foreground-muted">
                  Select a signal from the list to view details.
                </div>
              )}
            </aside>
          </>
        )}
      </div>
    </section>
  );
}
