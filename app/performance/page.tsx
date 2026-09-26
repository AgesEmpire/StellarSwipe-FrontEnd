"use client";

import { useEffect, useState } from "react";
import { PerformanceDashboard } from "@/components/performance/PerformanceDashboard";
import { NetworkErrorState } from "@/components/NetworkErrorState";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

type FreshnessState = "loading" | "fresh" | "stale" | "unavailable";

const STALE_AFTER_MS = 5 * 60 * 1000;

function formatFreshness(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function MetricFreshness({ timestamp }: { timestamp: number | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  let state: FreshnessState;
  if (timestamp === null) {
    state = "loading";
  } else if (now - timestamp > STALE_AFTER_MS) {
    state = "stale";
  } else {
    state = "fresh";
  }

  const label =
    state === "loading"
      ? "Loading"
      : state === "unavailable"
        ? "Unavailable"
        : formatFreshness(timestamp as number);

  const exact =
    timestamp === null
      ? "Data freshness unavailable"
      : `Data last updated ${new Date(timestamp).toLocaleString()}`;

  const tone =
    state === "stale"
      ? "text-amber-600"
      : state === "unavailable"
        ? "text-foreground-muted"
        : "text-foreground-muted";

  return (
    <span
      className={`inline-flex h-5 min-w-[4.5rem] items-center gap-1 text-xs ${tone}`}
      title={exact}
      aria-label={exact}
      data-freshness={state}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          state === "stale"
            ? "bg-amber-500"
            : state === "loading"
              ? "bg-foreground-muted/50"
              : "bg-emerald-500"
        }`}
      />
      <span className="truncate">{label}</span>
    </span>
  );
}

export default function PerformancePage() {
  const { isOnline } = useNetworkStatus();
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    if (isOnline) {
      setLastUpdated(Date.now());
    }
  }, [isOnline]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Performance Monitoring
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Anonymous metrics for load times, API latency, crashes, device
          performance, and user experience.
        </p>
        <div className="mt-2">
          <MetricFreshness timestamp={isOnline ? lastUpdated : null} />
        </div>
      </div>

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
