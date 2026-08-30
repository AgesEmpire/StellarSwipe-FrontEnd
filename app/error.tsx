"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Home, Flag } from "lucide-react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

const SUPPORT_EMAIL = "support@stellarswipe.io";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [sentryEventId, setSentryEventId] = useState<string | null>(null);

  useEffect(() => {
    Sentry.captureException(error);
    setSentryEventId(Sentry.lastEventId() ?? null);
  }, [error]);

  const reportHref = buildReportHref(error.digest, sentryEventId);

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
          This page encountered an error. Please try again or return to the home
          page.
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

        <a
          href={reportHref}
          data-error-digest={error.digest ?? ""}
          data-sentry-event-id={sentryEventId ?? ""}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Flag className="h-4 w-4" />
          Report this error
        </a>
      </div>
    </div>
  );
}

function buildReportHref(
  digest: string | undefined,
  eventId: string | null
): string {
  const subject = encodeURIComponent("Error Report – StellarSwipe");
  const body = encodeURIComponent(
    [
      `Error ID: ${digest ?? "n/a"}`,
      `Sentry Event ID: ${eventId ?? "n/a"}`,
      "",
      "Please describe what you were doing when the error occurred:",
      "",
    ].join("\n")
  );
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}
