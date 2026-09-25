"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Flag, Home, RefreshCw, Sparkles } from "lucide-react";
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

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign("/");
  };

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-background px-4 py-10 text-foreground sm:px-6">
      <section
        role="alert"
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 text-center shadow-lg sm:p-8"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary/10">
          <Sparkles className="h-7 w-7 text-accent-primary" aria-hidden="true" />
        </div>

        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent-primary">
          StellarSwipe needs a moment
        </p>

        <h1 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">
          This page could not load
        </h1>

        <p className="mx-auto max-w-md text-sm leading-6 text-foreground-muted">
          Nothing is lost. Try loading the page again, or return to where you
          were and continue from there.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <button
            onClick={reset}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>

          <button
            onClick={handleGoBack}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Go back
          </button>

          <Link
            href="/"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Go home
          </Link>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs leading-5 text-foreground-subtle">
            Still stuck? Send us a report and we will take a look.
          </p>

          <a
            href={reportHref}
            data-error-digest={error.digest ?? ""}
            data-sentry-event-id={sentryEventId ?? ""}
            className="mx-auto mt-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Flag className="h-4 w-4" aria-hidden="true" />
            Report this error
          </a>
        </div>
      </section>
    </main>
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
