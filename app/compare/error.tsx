"use client";

import { RouteErrorFallback } from "@/components/RouteErrorFallback";

export default function CompareError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback
      error={error}
      reset={reset}
      areaName="Signal comparison"
      parentHref="/app"
      parentLabel="Back to dashboard"
    />
  );
}
