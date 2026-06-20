"use client";

import { Component, ErrorInfo, ReactNode, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ScopedErrorBoundaryProps {
  children: ReactNode;
  sectionLabel: string;
  sectionName: string;
  description?: string;
  onRetry?: () => void | Promise<void>;
  resetKeys?: unknown[];
}

interface ScopedErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function changedResetKeys(previous?: unknown[], next?: unknown[]) {
  if (!previous || !next || previous.length !== next.length) {
    return previous !== next;
  }

  return previous.some((value, index) => value !== next[index]);
}

export class ScopedErrorBoundary extends Component<
  ScopedErrorBoundaryProps,
  ScopedErrorBoundaryState
> {
  state: ScopedErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ScopedErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[ScopedErrorBoundary:${this.props.sectionName}] Caught an error:`,
      error
    );
    console.error(
      `[ScopedErrorBoundary:${this.props.sectionName}] Component stack:`,
      errorInfo.componentStack
    );
  }

  componentDidUpdate(previousProps: ScopedErrorBoundaryProps) {
    if (
      this.state.hasError &&
      changedResetKeys(previousProps.resetKeys, this.props.resetKeys)
    ) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = async () => {
    this.setState({ hasError: false, error: null });
    await this.props.onRetry?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section
        role="alert"
        aria-live="polite"
        data-feature-boundary-fallback={this.props.sectionName}
        className="rounded-3xl border border-yellow-500/30 bg-yellow-500/5 p-5 text-foreground shadow-sm"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-500">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {this.props.sectionLabel} is temporarily unavailable
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {this.props.description ??
                "Only this section failed. The rest of the page is still available."}
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  Error details
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </section>
    );
  }
}

export function ErrorBoundaryTestProbe({ sectionName }: { sectionName: string }) {
  const [shouldThrow, setShouldThrow] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setShouldThrow(params.get("throwFeatureBoundary") === sectionName);
  }, [sectionName]);

  if (shouldThrow) {
    throw new Error(`Deliberate ${sectionName} feature boundary test error`);
  }

  return null;
}
