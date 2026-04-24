"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { TradeModal } from "@/components/TradeModal";
import { SignalCard } from "@/components/SignalCard";

export default function Home() {
  const { publicKey, connected, connect, disconnect } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);
  const [marketPrice, setMarketPrice] = useState(0.4821);
  const [loading, setLoading] = useState(false);

  const handleTrade = (price: number) => {
    setMarketPrice(price);
    setModalOpen(true);
  };

  // Demo: toggle skeleton loading
  const toggleLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2500);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 bg-gray-950">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold tracking-tight text-white">StellarSwipe</h1>
        <p className="mt-2 text-gray-400">
          Connect your Freighter wallet to get started
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex flex-col items-center gap-4"
      >
        {connected ? (
          <>
            <p className="text-sm text-gray-400 font-mono">
              {publicKey?.slice(0, 8)}...{publicKey?.slice(-8)}
            </p>
            <Button variant="outline" onClick={disconnect}>Disconnect</Button>
          </>
        ) : (
          <Button onClick={connect} size="lg">Connect Wallet</Button>
        )}
      </motion.div>

      {/* Signal Card demo */}
      <div className="flex flex-col items-center gap-3">
        <SignalCard loading={loading} onTrade={handleTrade} />
        <div className="flex gap-3">
          <button
            onClick={toggleLoading}
            className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
          >
            Preview skeleton
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
          >
            Open trade modal
          </button>
        </div>
      </div>

      <TradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        marketPrice={marketPrice}
        walletBalance={250}
      />
    </main>
  );
}
