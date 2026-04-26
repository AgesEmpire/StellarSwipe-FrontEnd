"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/query-core";
import { Button } from "@/components/ui/button";
import type { Signal } from "@/lib/signals";

interface SignalResponse {
  items: Signal[];
  page: number;
  pageSize: number;
  nextPage: number | null;
  hasMore: boolean;
}

const PAGE_SIZE = 10;

export function SignalFeed() {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useInfiniteQuery<SignalResponse, Error, InfiniteData<SignalResponse, number>>({
    queryKey: ["signals"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(`/api/signals?page=${pageParam}&pageSize=${PAGE_SIZE}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Unable to load the signal feed.");
      return response.json() as Promise<SignalResponse>;
    },
    getNextPageParam: (lastPage: SignalResponse) => lastPage.nextPage,
    initialPageParam: 1,
    staleTime: 1000 * 60,
  });

  const signals = useMemo<Signal[]>(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: "240px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, loadMore]);

  return (
    <section className="rounded-3xl border border-border bg-surface/80 p-6 shadow-xl">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-accent-sky">Signal feed</p>
          <h2 className="text-3xl font-semibold text-foreground">Live market signals</h2>
          <p className="max-w-2xl text-sm text-foreground-muted">
            Browse the latest actionable signals with seamless infinite scrolling.
          </p>
        </div>
        <div className="text-right text-sm text-foreground-muted">
          {isFetching && !signals.length ? "Loading signals..." : "Scroll down to load more."}
        </div>
      </div>

      <div className="space-y-4">
        {isError && (
          <div className="rounded-3xl border border-accent-danger/20 bg-accent-danger/10 p-5 text-sm text-accent-danger">
            {error?.message ?? "There was a problem loading the signal feed."}
          </div>
        )}

        {!isLoading && signals.length === 0 && (
          <div className="rounded-3xl border border-border bg-surface/80 p-8 text-center text-foreground-muted">
            No signals available right now.
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-3xl border border-border bg-surface p-6"
              >
                <div className="mb-4 h-6 w-3/5 rounded-xl bg-surface-high" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="h-5 rounded-xl bg-surface-high" />
                  <div className="h-5 rounded-xl bg-surface-high" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          signals.map((signal) => (
            <article
              key={signal.id}
              className="rounded-3xl border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-0.5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-foreground-muted">
                    {new Date(signal.timestamp).toLocaleString()}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                    {signal.ticker} • {signal.action}
                  </h3>
                </div>
                <div className="rounded-full border border-border bg-surface-high px-4 py-2 text-sm font-semibold text-accent-sky">
                  Confidence {signal.confidence}%
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-foreground-muted">{signal.details}</p>
            </article>
          ))
        )}
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        <div ref={sentinelRef} className="h-1 w-full" />

        {isFetchingNextPage && (
          <div className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground-muted">
            Loading more signals...
          </div>
        )}

        {!hasNextPage && signals.length > 0 && (
          <p className="text-center text-sm text-foreground-subtle">
            You&apos;ve reached the end of the feed.
          </p>
        )}

        {hasNextPage && (
          <Button variant="outline" onClick={loadMore} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "Loading more..." : "Load more signals"}
          </Button>
        )}
      </div>
    </section>
  );
}
