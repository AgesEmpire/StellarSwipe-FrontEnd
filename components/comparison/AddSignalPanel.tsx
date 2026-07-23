"use client";

import { useSignals } from "@/hooks/useSignals";
import { useComparisonStore } from "@/store/useComparisonStore";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Check, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AddSignalPanel() {
  const { data: signals, isLoading } = useSignals();
  const { addSignal, isSelected, canAdd } = useComparisonStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading signals…
      </div>
    );
  }

  if (!signals?.items?.length) {
    return (
      <EmptyState
        title="No signals available"
        description="Try again in a moment or adjust your signal source filters."
        className="rounded-xl bg-transparent py-6"
      />
    );
  }

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {signals.items.map((signal) => {
        const selected = isSelected(signal.id);
        const isBuy = signal.action === "BUY";
        return (
          <div
            key={signal.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-800/60 border border-white/5"
          >
            <div className="flex items-center gap-2 min-w-0">
              {isBuy ? (
                <TrendingUp className="h-4 w-4 text-green-400 shrink-0" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {signal.ticker}
                </p>
                {signal.provider && (
                  <p className="text-xs text-gray-400 truncate">
                    {signal.provider}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  "text-xs ml-1 shrink-0",
                  isBuy ? "text-green-400" : "text-red-400"
                )}
              >
                {signal.confidence}%
              </span>
            </div>
            <Button
              size="sm"
              variant={selected ? "secondary" : "default"}
              disabled={selected || (!canAdd() && !selected)}
              onClick={() => addSignal(signal)}
              aria-label={
                selected
                  ? "Already added"
                  : `Add ${signal.ticker} to comparison`
              }
              className="shrink-0 h-7 text-xs gap-1"
            >
              {selected ? (
                <Check className="h-3 w-3" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              {selected ? "Added" : "Add"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
