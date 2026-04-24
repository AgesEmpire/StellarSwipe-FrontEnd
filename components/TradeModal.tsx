"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info } from "lucide-react";

type OrderType = "LIMIT" | "MARKET";

interface TradeModalProps {
  open: boolean;
  onClose: () => void;
  walletBalance?: number;
  marketPrice?: number;
}

// Mock transaction builder
const mockBuildTx = (order: object) =>
  new Promise<void>((res) => setTimeout(() => { console.log("tx built", order); res(); }, 800));

export function TradeModal({ open, onClose, walletBalance = 250, marketPrice = 0.4821 }: TradeModalProps) {
  const [type, setType] = useState<OrderType>("LIMIT");
  const [limitPrice, setLimitPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [stopLoss, setStopLoss] = useState(10);
  const [positionLimit, setPositionLimit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const price = type === "MARKET" ? marketPrice : parseFloat(limitPrice) || 0;
  const total = price * (parseFloat(amount) || 0);
  const insufficient = total > walletBalance;
  const disabled = !amount || (type === "LIMIT" && !limitPrice) || insufficient || submitting;

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleConfirm = useCallback(async () => {
    setSubmitting(true);
    await mockBuildTx({ type, price, amount, stopLoss, positionLimit });
    setSubmitting(false);
    onClose();
  }, [type, price, amount, stopLoss, positionLimit, onClose]);

  const networkFee = "0.00001 XLM";
  const priceImpact = type === "MARKET" ? "~0.12%" : "~0.05%";
  const execMethod = type === "MARKET" ? "AMM Swap" : "Order Book";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${type === "LIMIT" ? "Limit" : "Market"} Order`}
            className={`relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl
              ${type === "MARKET"
                ? "bg-indigo-950/95 border-indigo-500/40"
                : "bg-gray-900/95 border-gray-700/60"}`}
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Place Order</h2>
              <button
                onClick={onClose}
                aria-label="Close modal"
                className="rounded-full p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Market / Limit Toggle */}
            <div className="flex rounded-lg bg-white/5 p-1 mb-5">
              {(["LIMIT", "MARKET"] as OrderType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all
                    ${type === t
                      ? "bg-white/15 text-white shadow"
                      : "text-gray-400 hover:text-white"}`}
                >
                  {t === "LIMIT" ? "Limit" : "Market"}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {/* Price row */}
              {type === "LIMIT" ? (
                <label className="block">
                  <span className="text-xs text-gray-400 mb-1 block">Limit Price (USDC)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </label>
              ) : (
                <div>
                  <span className="text-xs text-gray-400 mb-1 block">Current Market Price</span>
                  <div className="w-full rounded-lg bg-indigo-900/40 border border-indigo-500/30 px-3 py-2 text-indigo-300 text-sm font-mono">
                    ${marketPrice.toFixed(4)} USDC
                  </div>
                </div>
              )}

              {/* Amount */}
              <label className="block">
                <span className="text-xs text-gray-400 mb-1 block">Amount (XLM)</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </label>

              {/* Total (read-only) */}
              <div>
                <span className="text-xs text-gray-400 mb-1 block">Total (USDC)</span>
                <div className={`w-full rounded-lg border px-3 py-2 text-sm font-mono
                  ${insufficient ? "border-red-500/50 bg-red-900/20 text-red-400" : "border-white/10 bg-white/5 text-white"}`}>
                  ${total.toFixed(4)}
                  {insufficient && <span className="ml-2 text-xs text-red-400">Insufficient balance</span>}
                </div>
              </div>

              {/* Stop-loss slider */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Stop-Loss</span>
                  <span className="text-orange-400 font-medium">-{stopLoss}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              {/* Position limit toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300 flex items-center gap-1">
                  Position Limit
                  <Info size={13} className="text-gray-500" />
                </span>
                <button
                  role="switch"
                  aria-checked={positionLimit}
                  onClick={() => setPositionLimit((v) => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${positionLimit ? "bg-blue-500" : "bg-white/15"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${positionLimit ? "translate-x-5" : ""}`} />
                </button>
              </div>
            </div>

            {/* Footer metrics */}
            <div className="mt-5 rounded-lg bg-white/5 border border-white/10 px-4 py-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-gray-500">Network Fee</p>
                <p className="text-gray-200 font-medium mt-0.5">{networkFee}</p>
              </div>
              <div>
                <p className="text-gray-500">Price Impact</p>
                <p className="text-yellow-400 font-medium mt-0.5">{priceImpact}</p>
              </div>
              <div>
                <p className="text-gray-500">Execution</p>
                <p className="text-gray-200 font-medium mt-0.5">{execMethod}</p>
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={disabled}
              className={`mt-4 w-full rounded-xl py-3 text-sm font-semibold transition-all
                ${disabled
                  ? "bg-white/10 text-gray-500 cursor-not-allowed"
                  : type === "MARKET"
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                    : "bg-blue-600 hover:bg-blue-500 text-white"}`}
            >
              {submitting ? "Submitting…" : `Confirm ${type === "LIMIT" ? "Limit" : "Market"} Order`}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
