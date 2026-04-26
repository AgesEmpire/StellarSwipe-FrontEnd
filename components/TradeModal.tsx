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

const mockBuildTx = (order: object) =>
  new Promise<void>((res) => setTimeout(() => { console.log("tx built", order); res(); }, 800));

function validateField(value: string, label: string): string {
  if (!value.trim()) return `${label} is required`;
  const num = Number(value);
  if (isNaN(num)) return `${label} must be a number`;
  if (num <= 0) return `${label} must be greater than 0`;
  return "";
}

export function TradeModal({ open, onClose, walletBalance = 250, marketPrice = 0.4821 }: TradeModalProps) {
  const [type, setType] = useState<OrderType>("LIMIT");
  const [limitPrice, setLimitPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [stopLoss, setStopLoss] = useState(10);
  const [positionLimit, setPositionLimit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({ limitPrice: false, amount: false });

  const limitPriceError = type === "LIMIT" && touched.limitPrice ? validateField(limitPrice, "Limit price") : "";
  const amountError = touched.amount ? validateField(amount, "Amount") : "";

  const price = type === "MARKET" ? marketPrice : parseFloat(limitPrice) || 0;
  const total = price * (parseFloat(amount) || 0);
  const insufficient = total > walletBalance;
  const hasErrors = !!amountError || (type === "LIMIT" && !!limitPriceError);
  const disabled = !amount || (type === "LIMIT" && !limitPrice) || insufficient || submitting || hasErrors;

  useEffect(() => {
    if (!open) return;
    setTouched({ limitPrice: false, amount: false });
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
          <div
            className="absolute inset-0 bg-overlay/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${type === "LIMIT" ? "Limit" : "Market"} Order`}
            className={`relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl
              ${type === "MARKET"
                ? "bg-accent-market/10 border-accent-market/30"
                : "bg-surface border-border"}`}
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">Place Order</h2>
              <button
                onClick={onClose}
                aria-label="Close modal"
                className="rounded-full p-1 text-foreground-muted hover:text-foreground hover:bg-foreground/10 transition-colors"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Order type toggle */}
            <div role="group" aria-label="Order type" className="flex rounded-lg bg-foreground/5 p-1 mb-5">
              {(["LIMIT", "MARKET"] as OrderType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setType(t); setTouched((prev) => ({ ...prev, limitPrice: false })); }}
                  aria-pressed={type === t}
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all
                    ${type === t
                      ? "bg-foreground/15 text-foreground shadow"
                      : "text-foreground-muted hover:text-foreground"}`}
                >
                  {t === "LIMIT" ? "Limit" : "Market"}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {/* Price row */}
              {type === "LIMIT" ? (
                <div>
                  <label htmlFor="limit-price" className="text-xs text-foreground-muted mb-1 block">
                    Limit Price (USDC)
                  </label>
                  <input
                    id="limit-price"
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, limitPrice: true }))}
                    className={`w-full rounded-lg bg-input border px-3 py-2 text-foreground placeholder-foreground-subtle focus:outline-none focus:border-ring text-sm
                      ${limitPriceError ? "border-accent-danger" : "border-border"}`}
                  />
                  {limitPriceError && (
                    <p className="mt-1 text-xs text-accent-danger" role="alert">{limitPriceError}</p>
                  )}
                </div>
              ) : (
                <div>
                  <span className="text-xs text-foreground-muted mb-1 block">Current Market Price</span>
                  <div className="w-full rounded-lg bg-accent-market/40 border border-accent-market/30 px-3 py-2 text-accent-market text-sm font-mono">
                    ${marketPrice.toFixed(4)} USDC
                  </div>
                </div>
              )}

              {/* Amount */}
              <div>
                <label htmlFor="trade-amount" className="text-xs text-foreground-muted mb-1 block">
                  Amount (XLM)
                </label>
                <input
                  id="trade-amount"
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
                  className={`w-full rounded-lg bg-input border px-3 py-2 text-foreground placeholder-foreground-subtle focus:outline-none focus:border-ring text-sm
                    ${amountError ? "border-accent-danger" : "border-border"}`}
                />
                {amountError && (
                  <p className="mt-1 text-xs text-accent-danger" role="alert">{amountError}</p>
                )}
              </div>

              {/* Total (read-only) */}
              <div>
                <span className="text-xs text-foreground-muted mb-1 block">Total (USDC)</span>
                <div className={`w-full rounded-lg border px-3 py-2 text-sm font-mono
                  ${insufficient
                    ? "border-accent-danger/50 bg-accent-danger/10 text-accent-danger"
                    : "border-border bg-input text-foreground"}`}>
                  ${total.toFixed(4)}
                  {insufficient && (
                    <span className="ml-2 text-xs text-accent-danger">Insufficient balance</span>
                  )}
                </div>
              </div>

              {/* Stop-loss slider */}
              <div>
                <div className="flex justify-between text-xs text-foreground-muted mb-1">
                  <label htmlFor="stop-loss-slider">Stop-Loss</label>
                  <span className="text-accent-warning font-medium">-{stopLoss}%</span>
                </div>
                <input
                  id="stop-loss-slider"
                  type="range"
                  min={1}
                  max={50}
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  aria-label={`Stop-loss: ${stopLoss}%`}
                  aria-valuemin={1}
                  aria-valuemax={50}
                  aria-valuenow={stopLoss}
                  className="w-full accent-[hsl(var(--accent-warning))]"
                />
              </div>

              {/* Position limit toggle */}
              <div className="flex items-center justify-between">
                <span id="position-limit-label" className="text-sm text-foreground flex items-center gap-1">
                  Position Limit
                  <Info size={13} className="text-foreground-subtle" aria-hidden="true" />
                </span>
                <button
                  role="switch"
                  aria-checked={positionLimit}
                  aria-labelledby="position-limit-label"
                  onClick={() => setPositionLimit((v) => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    ${positionLimit ? "bg-primary" : "bg-foreground/15"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-foreground shadow transition-transform ${positionLimit ? "translate-x-5" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            {/* Footer metrics */}
            <div className="mt-5 rounded-lg bg-foreground/5 border border-border px-4 py-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-foreground-subtle">Network Fee</p>
                <p className="text-foreground font-medium mt-0.5">{networkFee}</p>
              </div>
              <div>
                <p className="text-foreground-subtle">Price Impact</p>
                <p className="text-accent-warning font-medium mt-0.5">{priceImpact}</p>
              </div>
              <div>
                <p className="text-foreground-subtle">Execution</p>
                <p className="text-foreground font-medium mt-0.5">{execMethod}</p>
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={disabled}
              aria-disabled={disabled}
              className={`mt-4 w-full rounded-xl py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                ${disabled
                  ? "bg-foreground/10 text-foreground-subtle cursor-not-allowed"
                  : type === "MARKET"
                    ? "bg-accent-market hover:opacity-90 text-foreground"
                    : "bg-primary hover:opacity-90 text-primary-foreground"}`}
            >
              {submitting ? "Submitting…" : `Confirm ${type === "LIMIT" ? "Limit" : "Market"} Order`}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
