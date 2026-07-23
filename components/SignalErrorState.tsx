"use client";

import {
  WifiOff,
  ServerCrash,
  RefreshCw,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NetworkError, ServerError } from "@/lib/api";
import { useState } from "react";

interface SignalErrorStateProps {
  error: Error;
  onRetry: () => void;
}

function getErrorDetails(error: Error): {
  icon: React.ReactNode;
  title: string;
  description: string;
  suggestions: string[];
  severity: "critical" | "warning";
} {
  const isNetwork = error instanceof NetworkError;
  const isServer = error instanceof ServerError;
  const message = error.message || "Unknown error";

  if (isNetwork) {
    return {
      icon: <WifiOff className="h-10 w-10 text-destructive" />,
      title: "Connection Error",
      description:
        "Unable to reach the signal service. Check your internet connection and try again.",
      suggestions: [
        "Verify your internet connection is active",
        "Check if your firewall allows connections to our service",
        "Try disabling any VPN or proxy if you're using one",
        "Wait a moment and retry",
      ],
      severity: "warning",
    };
  }

  if (isServer) {
    return {
      icon: <ServerCrash className="h-10 w-10 text-destructive" />,
      title: "Server Error",
      description:
        "The signal service is temporarily unavailable. Our team has been notified and is working on it.",
      suggestions: [
        "Try again in a few moments",
        "Check our status page for updates",
        "Contact support if the issue persists",
      ],
      severity: "critical",
    };
  }

  // Generic error
  return {
    icon: <AlertTriangle className="h-10 w-10 text-destructive" />,
    title: "Failed to Load Signals",
    description:
      message || "An unexpected error occurred while loading signals.",
    suggestions: [
      "Try refreshing the page",
      "Clear your browser cache",
      "Contact support",
    ],
    severity: "warning",
  };
}

export function SignalErrorState({ error, onRetry }: SignalErrorStateProps) {
  const [retrying, setRetrying] = useState(false);
  const details = getErrorDetails(error);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex flex-col items-center justify-center gap-4 rounded-2xl border p-10 text-center ${
        details.severity === "critical"
          ? "border-destructive/30 bg-destructive/5"
          : "border-yellow-500/30 bg-yellow-500/5"
      }`}
    >
      {details.icon}

      <div>
        <p
          className={
            details.severity === "critical"
              ? "font-semibold text-destructive"
              : "font-semibold text-yellow-600"
          }
        >
          {details.title}
        </p>
        <p className="mt-2 text-sm text-foreground-muted">
          {details.description}
        </p>

        {/* Suggestions */}
        <div className="mt-4 rounded-lg bg-white/3 border border-white/10 p-3 text-left">
          <p className="text-xs font-medium text-foreground-subtle mb-2">
            What you can try:
          </p>
          <ul className="space-y-1 text-xs text-foreground-muted">
            {details.suggestions.map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-foreground-subtle mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 w-full justify-center">
        <Button
          variant="default"
          size="sm"
          onClick={handleRetry}
          disabled={retrying}
          className="flex items-center gap-2"
        >
          {retrying ? (
            <>
              <Clock size={16} className="animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Try Again
            </>
          )}
        </Button>
      </div>

      {/* Error details for debugging */}
      <details className="mt-4 text-left w-full">
        <summary className="text-xs text-foreground-subtle cursor-pointer hover:text-foreground-muted">
          Error details (for debugging)
        </summary>
        <pre className="mt-2 rounded bg-black/20 p-2 text-xs text-foreground-muted overflow-auto max-h-32 whitespace-pre-wrap break-words">
          {error.message}
        </pre>
      </details>
    </div>
  );
}
