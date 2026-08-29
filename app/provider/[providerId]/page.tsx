"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  useProviderProfile,
  useProviderSignals,
} from "@/hooks/useProviderProfile";
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  UserMinus,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PageTransition } from "@/components/PageTransition";
import { UnfollowDialog } from "@/components/UnfollowDialog";
import { useUnfollowDialog } from "@/hooks/useUnfollowDialog";
import { usePaginationClamp } from "@/hooks/usePaginationClamp";

const SIGNALS_PER_PAGE = 5;

export default function ProviderProfilePage() {
  const router = useRouter();
  const params = useParams();
  const providerId = params?.providerId as string;

  const { data: provider, isLoading: providerLoading } =
    useProviderProfile(providerId);
  const { data: signals = [], isFetching: signalsFetching } =
    useProviderSignals(providerId);

  // Follow state — in a real app this comes from a query/store
  const [isFollowing, setIsFollowing] = useState(true);

  // Open positions copied from this provider — in a real app fetched from portfolio store
  const openCopiedPositions = signals.filter(
    (s) => s.outcome === "PENDING"
  ).length;

  const handleUnfollow = useCallback(() => {
    setIsFollowing(false);
  }, []);

  const { dialogState, requestUnfollow, handleConfirm, handleCancel } =
    useUnfollowDialog(handleUnfollow);

  // Keeps `page` valid as `signals` changes shape (new data, filtering,
  // etc.) instead of pointing at a page that no longer exists.
  const {
    page: currentPage,
    totalPages,
    offset,
    canGoPrevious,
    canGoNext,
    goToPrevious,
    goToNext,
  } = usePaginationClamp({
    totalItems: signals.length,
    pageSize: SIGNALS_PER_PAGE,
    resetKey: providerId,
  });
  const paginatedSignals = signals.slice(offset, offset + SIGNALS_PER_PAGE);

  if (providerLoading) {
    return (
      <PageTransition>
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 sm:gap-8 sm:p-8 bg-gray-950">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </PageTransition>
    );
  }

  if (!provider) {
    return (
      <PageTransition>
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 sm:gap-8 sm:p-8 bg-gray-950">
          <p className="text-center text-red-500">Provider not found</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col gap-6 p-4 sm:gap-8 sm:p-8 bg-gray-950 w-full max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Go back to previous page"
        >
          <ArrowLeft size={16} className="rtl-flip" />
          Back
        </button>

        {/* Provider header */}
        <header className="rounded-lg border bg-card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              {provider.name && (
                <h1 className="text-2xl font-bold text-white mb-2">
                  {provider.name}
                </h1>
              )}
              <p className="text-sm text-muted-foreground font-mono">
                {provider.address.slice(0, 12)}...{provider.address.slice(-8)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Rank</p>
                <p className="text-3xl font-bold text-green-600">
                  #{provider.rank}
                </p>
              </div>
              {isFollowing ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                  onClick={() =>
                    requestUnfollow(
                      provider.name ?? provider.address,
                      openCopiedPositions
                    )
                  }
                  aria-label={`Unfollow ${provider.name ?? "this provider"}`}
                >
                  <UserMinus size={14} aria-hidden="true" />
                  Unfollow
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setIsFollowing(true)}
                  aria-label={`Follow ${provider.name ?? "this provider"}`}
                >
                  Follow
                </Button>
              )}
            </div>
          </div>

          {provider.bio && (
            <p className="text-sm text-foreground mb-6 leading-relaxed">
              {provider.bio}
            </p>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
              <p className="font-semibold text-green-600">
                {provider.winRate}%
              </p>
            </div>
            <div className="rounded bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Total Signals
              </p>
              <p className="font-semibold text-foreground">
                {provider.totalSignals}
              </p>
            </div>
            <div className="rounded bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Reputation</p>
              <p className="font-semibold text-blue-600">
                {provider.reputation}%
              </p>
            </div>
            <div className="rounded bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Trust Score</p>
              <p className="font-semibold text-purple-600">
                {provider.trustScore}%
              </p>
            </div>
          </div>
        </header>

        {/* Stake information */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Stake & Trust
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Staked Amount
              </p>
              <p className="text-2xl font-bold text-foreground">
                {provider.staked
                  ? `$${provider.staked.toLocaleString()}`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Trust Score</p>
              <p className="text-2xl font-bold text-purple-600">
                {provider.trustScore}%
              </p>
            </div>
          </div>
        </div>

        {/* Recent signals */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Recent Signals
          </h2>

          {paginatedSignals.length === 0 ? (
            <EmptyState
              className="py-8"
              icon={<Inbox className="h-8 w-8 text-sky-400/80" />}
              title="No signals available"
              description="This provider hasn't published any signals yet. Check back later."
            />
          ) : (
            <div className="space-y-3">
              {paginatedSignals.map((signal) => (
                <div
                  key={signal.id}
                  className={`rounded-lg p-3 border ${
                    signal.outcome === "WIN"
                      ? "bg-green-500/10 border-green-500/30"
                      : signal.outcome === "LOSS"
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-yellow-500/10 border-yellow-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {signal.asset}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          signal.direction === "BUY"
                            ? "bg-green-600 text-white"
                            : "bg-red-600 text-white"
                        }`}
                      >
                        {signal.direction}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {signal.confidence}% confidence
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {signal.outcome === "WIN" && (
                        <TrendingUp
                          size={16}
                          className="text-green-600"
                          aria-label="Won"
                        />
                      )}
                      {signal.outcome === "LOSS" && (
                        <TrendingDown
                          size={16}
                          className="text-red-600"
                          aria-label="Lost"
                        />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          signal.outcome === "WIN"
                            ? "text-green-600"
                            : signal.outcome === "LOSS"
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {signal.outcome}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {new Date(signal.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <PaginationControls
            page={currentPage}
            totalPages={totalPages}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            onPrevious={goToPrevious}
            onNext={goToNext}
            isLoading={signalsFetching}
            className="mt-4 pt-4 border-t"
          />
        </div>
      </main>

      {/* Unfollow confirmation dialog */}
      <UnfollowDialog
        open={dialogState.isOpen}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
        providerName={dialogState.providerName}
        openPositionsCount={dialogState.openPositionsCount}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </PageTransition>
  );
}
