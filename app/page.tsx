"use client";

import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { useComparisonStore } from "@/store/useComparisonStore";

const DEMO_SIGNALS = [
  { id: "sig-1", name: "XLM / USDC" },
  { id: "sig-2", name: "BTC / XLM" },
  { id: "sig-3", name: "ETH / XLM" },
  { id: "sig-4", name: "AQUA / XLM" },
  { id: "sig-5", name: "yXLM / XLM" },
];

export default function Home() {
  const { publicKey, connected, connect, disconnect } = useWallet();
  const { addSignal, signals } = useComparisonStore();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 pb-32">
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

      {/* Signal comparison demo */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="w-full max-w-md"
        aria-label="Compare signals"
      >
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Compare signals
        </h2>
        <ul className="flex flex-col gap-2">
          {DEMO_SIGNALS.map((signal) => {
            const inTray = signals.some((s) => s.id === signal.id);
            return (
              <li
                key={signal.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm"
              >
                <span className="font-medium">{signal.name}</span>
                <Button
                  size="sm"
                  variant={inTray ? "secondary" : "outline"}
                  onClick={() => addSignal(signal)}
                  aria-pressed={inTray}
                  aria-label={
                    inTray
                      ? `${signal.name} already in comparison tray`
                      : `Add ${signal.name} to comparison`
                  }
                  disabled={inTray}
                >
                  {inTray ? "Added" : "Compare"}
                </Button>
              </li>
            );
          })}
        </ul>
      </motion.section>
    </main>
  );
}
