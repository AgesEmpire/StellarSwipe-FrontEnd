"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { TransactionSuccess } from "@/components/TransactionSuccess";
import { TransactionFailure } from "@/components/TransactionFailure";
import { PositionLimitToggle } from "@/components/PositionLimitToggle";
import { useTransactionStore } from "@/store/useTransactionStore";
import { usePositionLimitStore } from "@/store/usePositionLimitStore";
import { getAccountBalances } from "@/lib/stellar";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown, Wallet, Zap } from "lucide-react";

export default function Home() {
  const { publicKey, connected, connect, disconnect } = useWallet();
  const { setSuccess, setError, setPreservedInput } = useTransactionStore();
  const { enabled, percentage } = usePositionLimitStore();
  const [isExecuting, setIsExecuting] = useState(false);

  // Fetch portfolio balance
  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ["balances", publicKey],
    queryFn: () => getAccountBalances(publicKey!),
    enabled: !!publicKey,
    refetchInterval: 30_000,
  });

  const portfolioBalance = balances
    ? balances.reduce((acc, b) => acc + Number(b.balance), 0)
    : null;

  // Simulate a successful trade
  const handleSimulateSuccess = () => {
    setSuccess({
      hash: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
      amount: "500",
      price: "0.000012",
      fee: "0.00001",
      token: "USDC",
      timestamp: Date.now(),
    });
  };

  // Simulate a failed trade
  const handleSimulateFailure = () => {
    setPreservedInput({ amount: "500", token: "USDC", slippage: "0.5" });
    setError({
      message: "Insufficient liquidity for this trade.",
      code: "ERR_LOW_LIQUIDITY",
      reason: "The pool does not have enough tokens to complete the swap at the requested amount.",
    });
  };

  // Simulate a trade execution with position limit check
  const handleExecuteTrade = async () => {
    setIsExecuting(true);
    setPreservedInput({ amount: "500", token: "USDC" });

    // Simulate async trade execution
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Check position limit
    if (enabled && portfolioBalance) {
      const maxTrade = (portfolioBalance * percentage) / 100;
      const tradeAmount = 500;
      if (tradeAmount > maxTrade) {
        setError({
          message: `Trade exceeds position limit of ${maxTrade.toFixed(2)} XLM (${percentage}% of portfolio).`,
          code: "ERR_POSITION_LIMIT",
          reason: `Your trade of ${tradeAmount} XLM exceeds the ${percentage}% cap of ${maxTrade.toFixed(2)} XLM.`,
        });
        setIsExecuting(false);
        return;
      }
    }

    // Simulate random success/failure
    const success = Math.random() > 0.4;
    if (success) {
      setSuccess({
        hash: "0x" + Array.from({ length: 56 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join(""),
        amount: "500",
        price: "0.000012",
        fee: "0.00001",
        token: "USDC",
        timestamp: Date.now(),
      });
    } else {
      setError({
        message: "Transaction failed to execute.",
        code: "ERR_TX_FAILED",
        reason: "The transaction was rejected by the network. Please try again.",
      });
    }
    setIsExecuting(false);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-1/2 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative text-center"
      >
        <h1 className="text-4xl font-bold tracking-tight text-white">
          StellarSwipe
        </h1>
        <p className="mt-2 text-zinc-500">
          {connected
            ? "Ready to trade on Stellar"
            : "Connect your Freighter wallet to get started"}
        </p>
      </motion.div>

      {/* Wallet connection */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        {connected ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-2">
              <Wallet className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-zinc-400 font-mono">
                {publicKey?.slice(0, 8)}...{publicKey?.slice(-8)}
              </span>
            </div>
            <Button variant="outline" onClick={disconnect} size="sm">
              Disconnect
            </Button>
          </div>
        ) : (
          <Button onClick={connect} size="lg" className="gap-2">
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </Button>
        )}
      </motion.div>

      {/* Demo controls - showing all three features */}
      {connected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="w-full max-w-md space-y-4"
        >
          {/* Position Limit Toggle (#23) */}
          <PositionLimitToggle
            portfolioBalance={portfolioBalance}
            isLoading={balancesLoading}
          />

          {/* Trade simulation controls */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="mb-3 text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              Trade Simulator
            </h3>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleExecuteTrade}
                disabled={isExecuting}
                className="gap-2 bg-blue-600 text-white hover:bg-blue-500"
              >
                <ArrowUpDown className="h-4 w-4" />
                {isExecuting ? "Executing..." : "Execute Trade"}
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={handleSimulateSuccess}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-emerald-800/50 text-emerald-400 hover:bg-emerald-950/30"
                >
                  Simulate Success
                </Button>
                <Button
                  onClick={handleSimulateFailure}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-red-800/50 text-red-400 hover:bg-red-950/30"
                >
                  Simulate Failure
                </Button>
              </div>
            </div>
          </div>

          {/* Portfolio info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">Portfolio Balance</h3>
            {balancesLoading ? (
              <p className="text-sm text-zinc-600">Loading...</p>
            ) : portfolioBalance !== null ? (
              <p className="text-lg font-mono text-white">
                {portfolioBalance.toFixed(2)}{" "}
                <span className="text-sm text-zinc-500">XLM</span>
              </p>
            ) : (
              <p className="text-sm text-zinc-600">Unable to load balances</p>
            )}
          </div>
        </motion.div>
      )}

      {/* Transaction Success Modal (#20) */}
      <TransactionSuccess />

      {/* Transaction Failure Modal (#21) */}
      <TransactionFailure onRetry={(input) => {
        console.log("Retrying with preserved input:", input);
        // Re-trigger the trade with preserved input
        handleExecuteTrade();
      }} />
    </main>
  );
}
