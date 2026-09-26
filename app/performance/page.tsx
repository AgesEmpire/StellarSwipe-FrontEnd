"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { PerformanceDashboard } from "@/components/performance/PerformanceDashboard";
import { NetworkErrorState } from "@/components/NetworkErrorState";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const FRESHNESS_THRESHOLD_MS = 5 * 60 * 1000;

type RefreshStatus = "idle" | "pending" | "success" | "error";

function PerformanceDashboardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-border" />
            <div className="mt-3 h-7 w-20 animate-pulse rounded bg-border" />
            <div className="mt-3 h-3 w-16 animate-pulse rounded bg-border" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="h-4 w-40 animate-pulse rounded bg-border" />
        <div className="mt-4 h-56 w-full animate-pulse rounded bg-border sm:h-64 lg:h-72" />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-border" />
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-border" />
              <div className="h-4 flex-1 animate-pulse rounded bg-border" />
              <div className="h-4 w-16 shrink-0 animate-pulse rounded bg-border" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const { isOnline } = useNetworkStatus();
  const [lastUpdated, setLastUpdated] = useState<number>(() => Date.now());
  const [isStale, setIsStale] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>("idle");
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    const checkStaleness = () => {
      setIsStale(Date.now() - lastUpdated > FRESHNESS_THRESHOLD_MS);
    };
    checkStaleness();
    const interval = window.setInterval(checkStaleness, 30 * 1000);
    return () => window.clearInterval(interval);
  }, [lastUpdated]);

  const handleRefresh = useCallback(async () => {
    scrollPositionRef.current = window.scrollY;
    setRefreshStatus("pending");
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 600));
      setLastUpdated(Date.now());
      setIsStale(false);
      setRefreshStatus("success");
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: scrollPositionRef.current });
      });
    } catch {
      setRefreshStatus("error");
    }
  }, []);

  useEffect(() => {
    if (refreshStatus !== "success" && refreshStatus !== "error") return;
    const timeout = window.setTimeout(() => setRefreshStatus("idle"), 4000);
    return () => window.clearTimeout(timeout);
  }, [refreshStatus]);

  const refreshLabel =
    refreshStatus === "pending"
      ? "Refreshing…"
      : refreshStatus === "success"
        ? "Refreshed"
        : refreshStatus === "error"
          ? "Refresh failed"
          : "Refresh";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Performance Monitoring
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Anonymous metrics for load times, API latency, crashes, device
            performance, and user experience.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isStale && (
            <span
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
            >
              <span aria-hidden="true">●</span>
              Data may be out of date
            </span>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshStatus === "pending"}
            aria-busy={refreshStatus === "pending"}
            aria-label={refreshLabel}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span aria-hidden="true">
              {refreshStatus === "pending"
                ? "⟳"
                : refreshStatus === "success"
                  ? "✓"
                  : refreshStatus === "error"
                    ? "!"
                    : "⟳"}
            </span>
            {refreshLabel}
          </button>
        </div>
      </div>

      {refreshStatus === "error" && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          Could not refresh performance data. Please try again.
        </p>
      )}

      {!isOnline && (
        <div className="mb-6">
          <NetworkErrorState
            context="performance metrics"
            onRetry={() => window.location.reload()}
            variant="banner"
          />
        </div>
      )}

      <Suspense fallback={<PerformanceDashboardSkeleton />}>
        <PerformanceDashboard />
      </Suspense>
    </main>
  );
}
