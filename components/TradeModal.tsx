"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

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

  const focusTrapRef = useFocusTrap({ 
    isActive: open, 
    initialFocus: 'button[data-order-type="LIMIT"]' 
  });

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
            ref={focusTrapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trade-modal-title"
            aria-describedby="trade-modal-description"
            className={`relative z-10 mx-4 w-full max-w-md rounded-2xl border p-4 shadow-2xl sm:mx-0 sm:p-6
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
              <h2 id="trade-modal-title" className="text-lg font-semibold text-white">Place Order</h2>
              <button
                onClick={onClose}
                aria-label="Close trade modal"
                className="rounded-full p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <X size={18} />
              </button>
            </div>

            <p id="trade-modal-description" className="sr-only">
              Configure and place a {type.toLowerCase()} order for trading
            </p>

            {/* Market / Limit Toggle */}
            <div className="flex rounded-lg bg-white/5 p-1 mb-5" role="tablist" aria-label="Order type selection">
              {(["LIMIT", "MARKET"] as OrderType[]).map((t) => (
                <button
                  key={t}
                  data-order-type={t}
                  onClick={() => setType(t)}
                  role="tab"
                  aria-selected={type === t}
                  aria-controls={`${t.toLowerCase()}-panel`}
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                    ${type === t
                      ? "bg-white/15 text-white shadow"
                      : "text-gray-400 hover:text-white"}`}
                >
                  {t === "LIMIT" ? "Limit" : "Market"}
                </button>
              ))}
            </div>

            <div className="space-y-4" id={`${type.toLowerCase()}-panel`} role="tabpanel">
              {/* Price row */}
              {type === "LIMIT" ? (
                <label className="block">
                  <span className="text-xs text-gray-400 mb-1 block">Limit Price (USDC)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="0.00"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    aria-describedby="limit-price-help"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <span id="limit-price-help" className="sr-only">
                    Enter the maximum price you're willing to pay per token
                  </span>
                </label>
              ) : (
                <div>
                  <span className="text-xs text-gray-400 mb-1 block">Current Market Price</span>
                  <div 
                    className="w-full rounded-lg bg-indigo-900/40 border border-indigo-500/30 px-3 py-2 text-indigo-300 text-sm font-mono"
                    aria-label={`Current market price is ${marketPrice.toFixed(4)} USDC`}
                  >
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
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-describedby="amount-help"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <span id="amount-help" className="sr-only">
                  Enter the amount of XLM tokens you want to trade
                </span>
              </label>

              {/* Total (read-only) */}
              <div>
                <span className="text-xs text-gray-400 mb-1 block">Total (USDC)</span>
                <div 
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-mono
                    ${insufficient ? "border-red-500/50 bg-red-900/20 text-red-400" : "border-white/10 bg-white/5 text-white"}`}
                  aria-label={`Total cost: ${total.toFixed(4)} USDC${insufficient ? ". Insufficient balance." : ""}`}
                >
                  ${total.toFixed(4)}
                  {insufficient && <span className="ml-2 text-xs text-red-400">Insufficient balance</span>}
                </div>
              </div>

              {/* Stop-loss slider */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <label htmlFor="stop-loss-slider">Stop-Loss</label>
                  <span className="text-orange-400 font-medium" aria-live="polite">-{stopLoss}%</span>
                </div>
                <input
                  id="stop-loss-slider"
                  type="range"
                  min={1}
                  max={50}
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  aria-describedby="stop-loss-help"
                  className="w-full accent-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span id="stop-loss-help" className="sr-only">
                  Set the percentage loss at which to automatically sell. Currently set to {stopLoss} percent.
                </span>
              </div>

              {/* Position limit toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300 flex items-center gap-1">
                  Position Limit
                  <Info size={13} className="text-gray-500" aria-hidden="true" />
                </span>
                <button
                  role="switch"
                  aria-checked={positionLimit}
                  aria-describedby="position-limit-help"
                  onClick={() => setPositionLimit((v) => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${positionLimit ? "bg-blue-500" : "bg-white/15"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${positionLimit ? "translate-x-5" : ""}`} />
                  <span className="sr-only">{positionLimit ? "Disable" : "Enable"} position limit</span>
                </button>
                <span id="position-limit-help" className="sr-only">
                  Position limit helps manage risk by limiting the size of your position
                </span>
              </div>
            </div>

            {/* Footer metrics */}
            <div className="mt-5 rounded-lg bg-white/5 border border-white/10 px-3 py-3 grid grid-cols-3 gap-1 text-center text-xs sm:px-4 sm:gap-2">
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
              aria-describedby="confirm-button-help"
              className={`mt-4 w-full rounded-xl py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
                ${disabled
                  ? "bg-white/10 text-gray-500 cursor-not-allowed focus:ring-gray-500"
                  : type === "MARKET"
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white focus:ring-indigo-500"
                    : "bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500"}`}
            >
              {submitting ? "Submitting…" : `Confirm ${type === "LIMIT" ? "Limit" : "Market"} Order`}
            </button>
            <span id="confirm-button-help" className="sr-only">
              {disabled 
                ? insufficient 
                  ? "Cannot place order: insufficient balance"
                  : "Cannot place order: please fill in all required fields"
                : `Place ${type.toLowerCase()} order for ${amount || 0} XLM at ${type === "MARKET" ? "market price" : `${limitPrice || 0} USDC`}`
              }
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
