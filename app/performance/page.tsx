"use client";

import { PerformanceDashboard } from "@/components/performance/PerformanceDashboard";
import { NetworkErrorState } from "@/components/NetworkErrorState";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function PerformancePage() {
  const { isOnline } = useNetworkStatus();

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
