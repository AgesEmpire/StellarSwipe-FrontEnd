"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as Sentry from "@sentry/nextjs";

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Catches render-time crashes in the signal feed (e.g. malformed signal data)
// so a single broken card can't take down the rest of the dashboard.
export class SignalFeedErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.withScope((scope) => {
      if (errorInfo.componentStack) {
        scope.setContext("component_stack", {
          componentStack: errorInfo.componentStack,
        });
      }
      Sentry.captureException(error);
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"
        >
          <AlertTriangle
            className="h-10 w-10 text-destructive"
            aria-hidden="true"
          />

          <div>
            <p className="font-semibold text-destructive">
              Signal feed unavailable
            </p>
            <p className="mt-2 text-sm text-foreground-muted">
              Something went wrong while displaying the signal feed. The rest of
              the dashboard is unaffected.
            </p>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={this.handleRetry}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Retry
          </Button>

          {this.state.error && (
            <details className="mt-2 w-full text-left">
              <summary className="cursor-pointer text-xs text-foreground-subtle hover:text-foreground-muted">
                Error details (for debugging)
              </summary>
              <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-black/20 p-2 text-xs text-foreground-muted">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
