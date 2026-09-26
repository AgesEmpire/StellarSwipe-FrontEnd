"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PerformanceDashboard } from "@/components/performance/PerformanceDashboard";
import { NetworkErrorState } from "@/components/NetworkErrorState";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const FRESHNESS_THRESHOLD_MS = 5 * 60 * 1000;

type RefreshStatus = "idle" | "pending" | "success" | "error";

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

      <PerformanceDashboard />
    </main>
  );
}
