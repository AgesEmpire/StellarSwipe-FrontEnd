"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { RetryStateCard } from "@/components/ui/RetryStateCard";

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
        <RetryStateCard
          title="Signal feed unavailable"
          description="Something went wrong while displaying the signal feed. The rest of the dashboard is unaffected."
          onRetry={this.handleRetry}
          icon={<AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />}
          details={this.state.error?.message ?? null}
        />
      );
    }

    return this.props.children;
  }
}
