import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { SignalFeedServer } from "@/components/signal/SignalFeedServer";
import { SignalCardSkeleton } from "@/components/SignalCardSkeleton";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { useSignals } from "@/hooks/useSignals";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useSignalFilterStore } from "@/store/useSignalFilterStore";
import { useTransactionStore } from "@/store/useTransactionStore";
import { Button } from "@/components/ui/button";
import { SignalErrorState } from "@/components/SignalErrorState";
import { SignalFeedFilters } from "@/components/SignalFeedFilters";
import { SignalFeedErrorBoundary } from "@/components/signal/SignalFeedErrorBoundary";
import { Loader2 } from "lucide-react";
import { TradeModal } from "@/components/TradeModal";
import { WalletSelectionModal } from "@/components/WalletSelectionModal";
import { SignalCard } from "@/components/SignalCard";
import { WalletDropdown } from "@/components/WalletDropdown";
import { PageTransition } from "@/components/PageTransition";
import { PortfolioAllocationChart } from "@/components/chart/PortfolioAllocationChart";
import { PortfolioSummaryCards } from "@/components/PortfolioSummaryCards";
import { PnLWidget } from "@/components/chart/PnLWidget";
import { ResizableSplit } from "@/components/ResizableSplit";
import { OnChainConfirmationStatus } from "@/components/OnChainConfirmationStatus";
import { TransactionActivityFeed } from "@/components/TransactionActivityFeed";
import { PositionStopLossControl } from "@/components/PositionStopLossControl";
import { OnboardingFlow } from "@/components/OnboardingFlow";

export default function AppPage() {
  const { publicKey, connected } = useWallet();
  const { data: signals, isLoading, error, refetch } = useSignals();
  const { assets } = usePortfolio();
  const { direction, asset, provider } = useSignalFilterStore();
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const pendingTransaction = useTransactionStore((state) =>
    state.history.find((item) => item.status === "PENDING")
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [marketPrice, setMarketPrice] = useState(0.4821);
  const [loading, setLoading] = useState(false);

  const handleTrade = (pair: string, price: number) => {
    setMarketPrice(price);
    addTransaction({
      id: `tx-${Date.now()}`,
      hash: `${Date.now().toString(16)}${pair.replace(/[^a-zA-Z0-9]/g, "")}`,
      assetPair: pair,
      amount: "100",
      price: price.toFixed(4),
      fee: "0.0004",
      token: "XLM",
      timestamp: Date.now(),
      type: "SWAP",
      status: "PENDING",
      outcome: "PENDING",
    });
  };

  const toggleLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2500);
  };

  const availableAssets = useMemo(
    () => [...new Set((signals ?? []).map((s) => s.asset).filter(Boolean))].sort(),
    [signals]
  );

  const availableProviders = useMemo(
    () => [...new Set((signals ?? []).map((s) => (s as any).providerId).filter(Boolean))].sort(),
    [signals]
function SignalFeedSkeleton() {
  return (
    <div
      className="rounded-3xl border border-white/10 bg-slate-950/80 p-4 sm:p-6 space-y-4"
      role="status"
      aria-label="Loading signal feed"
    >
      <span className="sr-only">Loading signal feed…</span>
      {Array.from({ length: 3 }).map((_, i) => (
        <SignalCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function AppPage() {
  return (
    <PageTransition>
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8 lg:px-8 text-foreground">
        <header className="mx-auto mb-6 flex w-full max-w-7xl items-center justify-between sm:mb-8">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">StellarSwipe</h1>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm font-mono text-foreground-muted sm:block">
              {publicKey?.slice(0, 8)}...{publicKey?.slice(-8)}
            </p>
            <WalletDropdown />
          </div>
        </header>

        <div className="mx-auto mb-4 w-full max-w-7xl">
          <OnChainConfirmationStatus
            transactionHash={pendingTransaction?.hash}
            status={pendingTransaction?.status}
          />
        </div>

        <div className="mx-auto w-full max-w-7xl">
          <ResizableSplit
            storageKey="app-detail-panel-width"
            minRightWidth={280}
            maxRightWidth={520}
            defaultRightWidth={360}
            left={
            <div className="flex flex-col gap-4 min-w-0">
              <SignalFeedFilters
                availableAssets={availableAssets}
                availableProviders={availableProviders}
                signals={signals}
                isLoadingCounts={isLoading}
              />

              <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <SignalFeedErrorBoundary onRetry={refetch}>
                  {isLoading && (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
                    </div>
                  )}

                  {error && (
                    <SignalErrorState error={error as Error} onRetry={refetch} />
                  )}

                  {filteredSignals && filteredSignals.length === 0 && (
                    <p className="text-center text-sm text-foreground-muted">No signals available.</p>
                  )}

                  {filteredSignals && filteredSignals.length > 0 && (
                    <ul className="flex flex-col gap-3" role="list" aria-label="Signal list">
                      {filteredSignals.map((signal) => (
                        <li
                          key={signal.id}
                          className="rounded-xl border border-border p-3 text-sm flex flex-wrap items-center justify-between gap-2 sm:p-4"
                        >
                          <span className="font-medium text-base sm:text-sm text-foreground">{signal.asset}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${signal.action === "BUY" ? "bg-green-500/15 text-green-400" : signal.action === "SELL" ? "bg-red-500/15 text-red-400" : "bg-slate-500/15 text-slate-400"}`}
                          >
                            {signal.action}
                          </span>
                          <span className="text-muted-foreground text-xs">{signal.confidence}% confidence</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </SignalFeedErrorBoundary>
              </div>

              <div className="flex w-full max-w-md flex-col items-center gap-3 px-4 sm:px-0">
                <SignalCard
                  loading={loading}
                  onTrade={handleTrade}
                  providerStake={50000}
                  providerReputation={85}
                  portfolioBalance={assets.reduce((sum, asset) => sum + asset.value, 0)}
                />
                <div className="flex gap-3">
                  <button
                    onClick={toggleLoading}
                    className="text-xs text-foreground-subtle hover:text-foreground-muted underline transition-colors"
                  >
                    Preview skeleton
                  </button>
                  <button
                    onClick={() => setModalOpen(true)}
                    className="text-xs text-foreground-subtle hover:text-foreground-muted underline transition-colors"
                  >
                    Open trade modal
                  </button>
                </div>
              </div>
            </div>
            }
            right={
              <>
                <PortfolioAllocationChart />
                <PortfolioSummaryCards />
                <PnLWidget />
              </>
            }
          />
        </div>

        <TradeModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          marketPrice={marketPrice}
          walletBalance={250}
          portfolioBalance={assets.reduce((sum, asset) => sum + asset.value, 0)}
        />
      </main>
    </PageTransition>
    <AppShell>
      <Suspense fallback={<SignalFeedSkeleton />}>
        <SignalFeedServer />
      </Suspense>
    </AppShell>
  );
}
