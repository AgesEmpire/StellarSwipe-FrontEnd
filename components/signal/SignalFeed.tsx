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
      if (!response.ok) {
        throw new Error("Unable to load the signal feed.");
      }
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
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      {
        rootMargin: "240px",
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, loadMore]);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-4 shadow-xl shadow-slate-950/10 sm:p-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-400/90">Signal feed</p>
          <h2 className="text-xl font-semibold sm:text-2xl md:text-3xl">Live market signals</h2>
          <p className="max-w-2xl text-sm text-slate-400">
            Browse the latest actionable signals with seamless infinite scrolling.
          </p>
        </div>
        <div className="text-right text-sm text-slate-400">
          {isFetching && !signals.length ? "Loading signals..." : "Scroll down to load more."}
        </div>
      </div>

      <div className="space-y-4">
        {isError ? (
          <div className="rounded-3xl border border-rose-200/20 bg-rose-50/10 p-5 text-sm text-rose-200">
            {error?.message ?? "There was a problem loading the signal feed."}
          </div>
        ) : null}

        {!isLoading && signals.length === 0 ? (
          <div className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-8 text-center text-slate-300">
            No signals available right now.
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-3xl border border-white/10 bg-slate-900/80 p-4 sm:p-6"
              >
                <div className="mb-4 h-6 w-3/5 rounded-xl bg-slate-700" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="h-5 rounded-xl bg-slate-700" />
                  <div className="h-5 rounded-xl bg-slate-700" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          signals.map((signal) => (
            <article
              key={signal.id}
              className="rounded-3xl border border-white/10 bg-slate-950/90 p-4 shadow-sm shadow-slate-950/20 transition hover:-translate-y-0.5 sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {new Date(signal.timestamp).toLocaleString()}
                  </p>
                  <h3 className="mt-2 text-base font-semibold tracking-tight text-white sm:text-xl">
                    {signal.ticker} • {signal.action}
                  </h3>
                </div>
                <div className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-sky-300 sm:px-4 sm:py-2 sm:text-sm">
                  Confidence {signal.confidence}%
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">{signal.details}</p>
            </article>
          ))
        )}
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        <div ref={sentinelRef} className="h-1 w-full" />

        {isFetchingNextPage ? (
          <div className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300">
            Loading more signals...
          </div>
        ) : null}

        {!hasNextPage && signals.length > 0 ? (
          <p className="text-center text-sm text-slate-500">
            You’ve reached the end of the feed.
          </p>
        ) : null}

        {hasNextPage ? (
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading more..." : "Load more signals"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
