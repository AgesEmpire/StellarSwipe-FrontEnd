"use client";

import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { SecurityMetrics } from "@/components/SecurityMetrics";

export default function Home() {
  const { publicKey, connected, connect, disconnect } = useWallet();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold tracking-tight">StellarSwipe</h1>
        <p className="mt-2 text-muted-foreground">
          Connect your Freighter wallet to get started
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        {connected ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground font-mono">
              {publicKey?.slice(0, 8)}...{publicKey?.slice(-8)}
            </p>
            <Button variant="outline" onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <Button onClick={connect} size="lg">
            Connect Wallet
          </Button>
        )}
      </motion.div>
      <SecurityMetrics />
    </main>
  );
}
