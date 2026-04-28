"use client";

import { RadioTower, RefreshCw, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SignalEmptyStateProps {
  onRefresh: () => void;
}

export function SignalEmptyState({ onRefresh }: SignalEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border border-white/10 bg-slate-900/60 px-6 py-16 text-center">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-slate-800/80">
        <RadioTower className="h-8 w-8 text-sky-400/70" aria-hidden="true" />
      </div>

      {/* Copy */}
      <div className="max-w-xs">
        <p className="text-base font-semibold text-white">No signals available right now</p>
        <p className="mt-1.5 text-sm text-foreground-muted">
          New signals appear as providers publish them. Follow providers to get notified first.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="sm" variant="outline" onClick={onRefresh} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Refresh
        </Button>
        <Button size="sm" asChild className="gap-2">
          <Link href="/providers">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Follow Providers
          </Link>
        </Button>
      </div>
    </div>
  );
}
