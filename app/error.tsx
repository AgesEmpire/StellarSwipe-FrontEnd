"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Route Error] Route-level error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-accent-danger/30 bg-accent-danger/10 p-6 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-danger/20">
          <AlertTriangle className="h-8 w-8 text-accent-danger" />
        </div>

        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Page Error
        </h2>

        <p className="mb-4 text-sm text-foreground-muted">
          This page encountered an error. Please try again or return to the
          home page.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={reset}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>

          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
