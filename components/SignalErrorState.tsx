"use client";

import { WifiOff, ServerCrash, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NetworkError, ServerError } from "@/lib/api";

interface SignalErrorStateProps {
  error: Error;
  onRetry: () => void;
}

export function SignalErrorState({ error, onRetry }: SignalErrorStateProps) {
  const isNetwork = error instanceof NetworkError;
  const Icon = isNetwork ? WifiOff : ServerCrash;
  const label = isNetwork ? "Network Error" : "Server Error";

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
      <Icon className="h-10 w-10 text-destructive" />
      <div>
        <p className="font-semibold text-destructive">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}
