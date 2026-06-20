"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, ChevronDown, Loader2, Trash2, Zap } from "lucide-react";
import { useBookmarkStore } from "@/store/useBookmarkStore";
import { useSignalsFeed } from "@/hooks/useSignalsFeed";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/PageTransition";
import { TradeModal } from "@/components/TradeModal";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/signals";

function marketPriceForSignal(signal: Signal) {
  return Number((0.42 + signal.confidence / 1000).toFixed(4));
}

export default function BookmarkedSignalsPage() {
  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const toggleBookmark = useBookmarkStore((state) => state.toggleBookmark);
  const { signals, isLoading, error, refetch } = useSignalsFeed({ pageSize: 50 });
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [tradeSignal, setTradeSignal] = useState<Signal | null>(null);

  const bookmarkedSignals = useMemo(
    () => signals.filter((signal) => bookmarks.includes(signal.id)),
    [bookmarks, signals]
  );

  return (
    <PageTransition>
      <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-sky">
                Saved signals
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Bookmarked Signals
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
                Review saved trade ideas, open their details, remove stale bookmarks,
                or launch a trade ticket from one focused page.
              </p>
            </div>
            <Button asChild variant="outline" className="w-fit">
              <Link href="/signals">Browse signals</Link>
            </Button>
          </header>

          {isLoading && (
            <div
              className="flex items-center justify-center rounded-3xl border border-border bg-card py-16"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-foreground-muted" />
              <span className="text-sm text-foreground-muted">Loading bookmarked signals...</span>
            </div>
          )}

          {error && (
            <div
              className="rounded-3xl border border-accent-danger/20 bg-accent-danger/10 p-6"
              role="alert"
            >
              <h2 className="text-lg font-semibold text-foreground">Unable to load signals</h2>
              <p className="mt-2 text-sm text-foreground-muted">
                Bookmarks are saved locally, but the signal feed is needed to show their latest
                details.
              </p>
              <Button className="mt-4" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !error && bookmarkedSignals.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/10 text-accent-sky">
                <Bookmark className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">No bookmarked signals yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-foreground-muted">
                Use the bookmark button on a signal card to save ideas here for later review.
              </p>
              <Button asChild className="mt-5">
                <Link href="/signals">Find signals to bookmark</Link>
              </Button>
            </div>
          )}

          {!isLoading && !error && bookmarkedSignals.length > 0 && (
            <ul className="grid gap-4" aria-label="Bookmarked signal list">
              {bookmarkedSignals.map((signal) => {
                const expanded = expandedSignalId === signal.id;
                const marketPrice = marketPriceForSignal(signal);

                return (
                  <li
                    key={signal.id}
                    className="rounded-3xl border border-border bg-card p-5 shadow-sm"
                  >
                    <article aria-labelledby={`bookmark-title-${signal.id}`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-foreground-muted">
                            {signal.provider ?? "Signal provider"}
                          </p>
                          <h2
                            id={`bookmark-title-${signal.id}`}
                            className="mt-1 text-xl font-semibold"
                          >
                            {signal.ticker} / USDC
                          </h2>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 font-semibold",
                                signal.action === "BUY"
                                  ? "bg-green-500/15 text-green-500"
                                  : signal.action === "SELL"
                                  ? "bg-red-500/15 text-red-500"
                                  : "bg-slate-500/15 text-foreground-muted"
                              )}
                            >
                              {signal.action}
                            </span>
                            <span className="rounded-full border border-border px-2.5 py-1 text-foreground-muted">
                              {signal.confidence}% confidence
                            </span>
                            {signal.status && (
                              <span className="rounded-full border border-border px-2.5 py-1 text-foreground-muted">
                                {signal.status}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setExpandedSignalId(expanded ? null : signal.id)
                            }
                            aria-expanded={expandedSignalId === signal.id}
                            aria-controls={`bookmark-details-${signal.id}`}
                          >
                            View detail
                            <ChevronDown
                              className={cn(
                                "h-3.5 w-3.5 transition-transform",
                                expanded && "rotate-180"
                              )}
                              aria-hidden="true"
                            />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setTradeSignal(signal)}
                            aria-label={`Trade ${signal.ticker} signal`}
                          >
                            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                            Trade
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleBookmark(signal.id)}
                            aria-label={`Remove ${signal.ticker} from bookmarks`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Unbookmark
                          </Button>
                        </div>
                      </div>

                      {expanded && (
                        <div
                          id={`bookmark-details-${signal.id}`}
                          className="mt-5 rounded-2xl border border-border bg-surface/60 p-4"
                        >
                          <dl className="grid gap-3 text-sm sm:grid-cols-3">
                            <div>
                              <dt className="text-foreground-muted">Rationale</dt>
                              <dd className="mt-1 text-foreground">{signal.details}</dd>
                            </div>
                            <div>
                              <dt className="text-foreground-muted">Published</dt>
                              <dd className="mt-1 font-mono text-foreground">
                                <time dateTime={signal.timestamp}>
                                  {new Date(signal.timestamp).toLocaleString()}
                                </time>
                              </dd>
                            </div>
                            <div>
                              <dt className="text-foreground-muted">Indicative price</dt>
                              <dd className="mt-1 font-mono text-foreground">
                                ${marketPrice.toFixed(4)}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      )}
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <TradeModal
          open={tradeSignal !== null}
          onClose={() => setTradeSignal(null)}
          marketPrice={tradeSignal ? marketPriceForSignal(tradeSignal) : 0.4821}
          onConfirm={() => setTradeSignal(null)}
        />
      </main>
    </PageTransition>
  );
}
