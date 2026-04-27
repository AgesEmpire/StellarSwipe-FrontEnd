"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { useSignals } from "@/hooks/useSignals";
import { Button } from "@/components/ui/button";
import { SignalErrorState } from "@/components/SignalErrorState";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { publicKey, connected, connect, disconnect } = useWallet();
  const { data: signals, isLoading, error, refetch } = useSignals();
import { TradeModal } from "@/components/TradeModal";
import { WalletSelectionModal } from "@/components/WalletSelectionModal";
import { SignalCard } from "@/components/SignalCard";
import { CTABanner } from "@/components/CTABanner";
import { HowItWorks } from "@/components/HowItWorks";
import { Footer } from "@/components/Footer";

export default function Home() {
  const { publicKey, connected, disconnect } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [marketPrice, setMarketPrice] = useState(0.4821);
  const [loading, setLoading] = useState(false);

  const handleTrade = (price: number) => {
    setMarketPrice(price);
    setModalOpen(true);
  };

  const toggleLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2500);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 sm:gap-8 sm:p-8 bg-gray-950">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative text-center"
      >
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">StellarSwipe</h1>
        <p className="mt-2 text-gray-400">
          Connect your Freighter wallet to get started
        </p>
      </motion.div>

      {/* Wallet connection */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex flex-col items-center gap-4"
      >
        {connected ? (
          <>
            <p className="text-sm text-foreground-muted font-mono">
              {publicKey?.slice(0, 8)}...{publicKey?.slice(-8)}
            </p>
            <Button 
              variant="outline" 
              onClick={disconnect}
              className="focus:ring-2 focus:ring-blue-500"
            >
              Disconnect Wallet
            </Button>
          </>
        ) : (
          <Button 
            onClick={() => setWalletModalOpen(true)} 
            size="lg"
            className="focus:ring-2 focus:ring-blue-500"
          >
            Connect Wallet
          </Button>
        )}
      </motion.div>

      <div className="w-full max-w-md">
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <SignalErrorState error={error as Error} onRetry={refetch} />
        )}

        {signals && signals.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No signals available.</p>
        )}

        {signals && signals.length > 0 && (
          <ul className="flex flex-col gap-3">
            {signals.map((signal) => (
              <li
                key={signal.id}
                className="rounded-xl border p-4 text-sm flex justify-between items-center"
              >
                <span className="font-medium">{signal.asset}</span>
                <span
                  className={signal.action === "BUY" ? "text-green-500" : "text-red-500"}
                >
                  {signal.action}
                </span>
                <span className="text-muted-foreground">{signal.confidence}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Signal Card demo */}
      <div className="flex w-full max-w-md flex-col items-center gap-3 px-4 sm:px-0">
        <SignalCard loading={loading} onTrade={handleTrade} />
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

      {/* CTA Banner */}
      <div className="w-full max-w-3xl">
        <CTABanner />
      </div>

      <Footer />

      <TradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        marketPrice={marketPrice}
        walletBalance={250}
      />

      <WalletSelectionModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
    </main>
  );
}
