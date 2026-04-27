"use client";

import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { useSignals } from "@/hooks/useSignals";
import { Button } from "@/components/ui/button";
import { WalletDropdown } from "@/components/WalletDropdown";
import { SignalErrorState } from "@/components/SignalErrorState";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { connected, connect } = useWallet();
  const { data: signals, isLoading, error, refetch } = useSignals();

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
          <WalletDropdown />
        ) : (
          <Button onClick={connect} size="lg">
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
    </main>
  );
}
