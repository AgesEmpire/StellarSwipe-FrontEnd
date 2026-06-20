"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info, AlertCircle } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useDemoModeStore } from "@/store/useDemoModeStore";
import { usePositionLimitStore } from "@/store/usePositionLimitStore";
import { FeeDisclosurePanel } from "@/components/FeeDisclosurePanel";
import { SlippageWarning } from "@/components/SlippageWarning";
import { usePriceFormat } from "@/hooks/usePriceFormat";

type OrderType = "LIMIT" | "MARKET";

interface PositionDetails {
  amount: string;
  price: number;
  orderType: OrderType;
}

interface TradeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: (details: PositionDetails) => void;
  walletBalance?: number;
  marketPrice?: number;
  portfolioBalance?: number;
}

const mockBuildTx = (order: object) =>
  new Promise<void>((res) =>
    setTimeout(() => {
      console.log("tx built", order);
      res();
    }, 800)
  );

function validateField(value: string, label: string): string {
  if (!value.trim()) return `${label} is required`;
  const num = Number(value);
  if (isNaN(num)) return `${label} must be a number`;
  if (num <= 0) return `${label} must be greater than 0`;
  return "";
}

export function TradeModal({
  open,
  onClose,
  onConfirm,
  walletBalance = 250,
  marketPrice = 0.4821,
  portfolioBalance = 0,
}: TradeModalProps) {
  const [type, setType] = useState<OrderType>("LIMIT");
  const [limitPrice, setLimitPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [stopLoss, setStopLoss] = useState(10);
  const [positionLimit, setPositionLimit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({ limitPrice: false, amount: false });
  // Slippage warning: shown when estimated slippage exceeds threshold
  const [slippageAcknowledged, setSlippageAcknowledged] = useState(false);
  const { isDemoMode } = useDemoModeStore();
  const { enabled: positionLimitEnabled, percentage: positionLimitPercentage } =
    usePositionLimitStore();
  const fmt = usePriceFormat();

  // Live-region ref for announcing order-type changes to screen readers
  const liveRegionRef = useRef<HTMLSpanElement>(null);

  // Calculate position limit in USD value
  const positionLimitInUSD = useMemo(() => {
    if (!positionLimitEnabled || !portfolioBalance) return null;
    return (portfolioBalance * positionLimitPercentage) / 100;
  }, [positionLimitEnabled, portfolioBalance, positionLimitPercentage]);

  const limitPriceError =
    type === "LIMIT" && touched.limitPrice ? validateField(limitPrice, "Limit price") : "";
  const amountError = touched.amount ? validateField(amount, "Amount") : "";

  const focusTrapRef = useFocusTrap({
    isActive: open,
    initialFocus: 'button[data-order-type="LIMIT"]',
  });

  const price = type === "MARKET" ? marketPrice : parseFloat(limitPrice) || 0;
  const total = price * (parseFloat(amount) || 0);
  const insufficient = total > walletBalance;
  const exceedsPositionLimit =
    positionLimitEnabled && positionLimitInUSD !== null && total > positionLimitInUSD;
  const hasErrors = !!amountError || (type === "LIMIT" && !!limitPriceError);
  const disabled =
    !amount ||
    (type === "LIMIT" && !limitPrice) ||
    insufficient ||
    exceedsPositionLimit ||
    submitting ||
    hasErrors ||
    showSlippageWarning;

  // Estimate slippage: market orders use a fixed proxy; limit orders use
  // the deviation between the user's limit price and the current market price.
  const estimatedSlippage =
    type === "MARKET"
      ? 0.12 // proxy for AMM price impact shown in footer
      : price > 0
      ? Math.abs((price - marketPrice) / marketPrice) * 100
      : 0;
  const SLIPPAGE_THRESHOLD = 1; // percent
  const showSlippageWarning =
    estimatedSlippage > SLIPPAGE_THRESHOLD && !slippageAcknowledged && !!amount;

  // Reset form state when modal opens
  useEffect(() => {
    if (open) {
      setTouched({ limitPrice: false, amount: false });
      setSlippageAcknowledged(false);
    }
  }, [open]);

  // Keyboard shortcuts: Escape → close, Enter (outside interactive elements) → confirm
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Enter shortcut to confirm — only when focus is NOT on a button/link/input
      // (those elements handle Enter natively)
      if (e.key === "Enter" && !disabled) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        const role = (e.target as HTMLElement)?.getAttribute("role");
        const isInteractive =
          tag === "button" ||
          tag === "a" ||
          tag === "input" ||
          tag === "select" ||
          tag === "textarea" ||
          role === "button" ||
          role === "switch";
        if (!isInteractive) {
          e.preventDefault();
          handleConfirm();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, disabled, onClose]);

  const handleConfirm = useCallback(async () => {
    if (disabled) return;
    setSubmitting(true);
    await mockBuildTx({ type, price, amount, stopLoss, positionLimit });
    setSubmitting(false);
    onConfirm ? onConfirm() : onClose();
  }, [type, price, amount, stopLoss, positionLimit, onClose, onConfirm, disabled]);

  // Announce order-type changes to screen readers via live region
  const handleOrderTypeChange = (newType: OrderType) => {
    setType(newType);
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = `Order type changed to ${newType === "LIMIT" ? "Limit" : "Market"}`;
    }
  };

  const networkFee = "0.00001 XLM";
  const priceImpact = type === "MARKET" ? "~0.12%" : "~0.05%";
  const execMethod = type === "MARKET" ? "AMM Swap" : "Order Book";
  const tradeFeePercent = type === "MARKET" ? 0.0035 : 0.002;
  const tradeFee = total * tradeFeePercent;
  const parsedNetworkFeeXLM = parseFloat(networkFee.split(" ")[0]) || 0;
  const networkFeeUSDC = parsedNetworkFeeXLM * (marketPrice || price || 0);
  const netAmount = Math.max(0, total - tradeFee - networkFeeUSDC);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-modal flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay — click to close */}
          <div
            className="absolute inset-0 bg-overlay/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Hidden live region for screen-reader announcements */}
          <span
            ref={liveRegionRef}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          />

          {/* Modal panel */}
          <motion.div
            ref={focusTrapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trade-modal-title"
            aria-describedby="trade-modal-description"
            className={`relative z-overlay mx-4 w-full max-w-md rounded-2xl border p-4 shadow-2xl sm:mx-0 sm:p-6
              ${
                type === "MARKET"
                  ? "bg-accent-market/10 border-accent-market/30"
                  : "bg-surface border-border"
              }`}
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2
                  id="trade-modal-title"
                  className="text-lg font-semibold text-foreground"
                >
                  Place Order
                </h2>
                <p id="trade-modal-description" className="sr-only">
                  Use Tab to navigate fields. Press Escape to close. Press Enter to confirm when
                  the form is valid.
                </p>
                {isDemoMode && (
                  <span className="text-xs text-blue-400 font-medium">Demo Mode</span>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close modal (Escape)"
                className="rounded-full p-1 text-foreground-muted hover:text-foreground hover:bg-foreground/10 transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Order type toggle */}
            <div
              role="group"
              aria-label="Order type"
              className="flex rounded-lg bg-foreground/5 p-1 mb-5"
            >
              {(["LIMIT", "MARKET"] as OrderType[]).map((t) => (
                <button
                  key={t}
                  data-order-type={t}
                  onClick={() => handleOrderTypeChange(t)}
                  aria-pressed={type === t}
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface
                    ${
                      type === t
                        ? "bg-foreground/15 text-foreground shadow"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                >
                  {t === "LIMIT" ? "Limit" : "Market"}
                </button>
              ))}
            </div>

            <div
              className="space-y-4"
              id={`${type.toLowerCase()}-panel`}
              role="group"
              aria-label={`${type === "LIMIT" ? "Limit" : "Market"} order fields`}
            >
              {/* Price row */}
              {type === "LIMIT" ? (
                <div>
                  <label
                    htmlFor="limit-price"
                    className="text-xs text-foreground-muted mb-1 block"
                  >
                    Limit Price (USDC)
                  </label>
                  <input
                    id="limit-price"
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="0.00"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, limitPrice: true }))}
                    aria-describedby={limitPriceError ? "limit-price-error" : undefined}
                    aria-invalid={!!limitPriceError}
                    className="w-full rounded-lg bg-input border border-border px-3 py-2 text-foreground placeholder-foreground-subtle text-sm
                      focus:outline-none focus:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
                  />
                  {limitPriceError && (
                    <p id="limit-price-error" role="alert" className="mt-1 text-xs text-accent-danger">
                      {limitPriceError}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <span className="text-xs text-foreground-muted mb-1 block">
                    Current Market Price
                  </span>
                  <div
                    className="w-full rounded-lg bg-accent-market/40 border border-accent-market/30 px-3 py-2 text-accent-market text-sm font-mono"
                    aria-label={`Current market price: ${fmt(marketPrice)} USDC`}
                  >
                    {fmt(marketPrice)} USDC
                  </div>
                </div>
              )}

              {/* Amount */}
              <div>
                <label
                  htmlFor="trade-amount"
                  className="text-xs text-foreground-muted mb-1 block"
                >
                  Amount (XLM)
                </label>
                <input
                  id="trade-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
                  aria-describedby={amountError ? "trade-amount-error" : undefined}
                  aria-invalid={!!amountError}
                  className="w-full rounded-lg bg-input border border-border px-3 py-2 text-foreground placeholder-foreground-subtle text-sm
                    focus:outline-none focus:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
                />
                {amountError && (
                  <p id="trade-amount-error" role="alert" className="mt-1 text-xs text-accent-danger">
                    {amountError}
                  </p>
                )}
              </div>

              {/* Total (read-only) */}
              <div>
                <span className="text-xs text-foreground-muted mb-1 block">Total (USDC)</span>
                <div
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-mono
                    ${
                      insufficient
                        ? "border-accent-danger/50 bg-accent-danger/10 text-accent-danger"
                        : "border-border bg-input text-foreground"
                    }`}
                  aria-label={`Total: $${total.toFixed(4)} USDC${insufficient ? " — insufficient balance" : ""}`}
                >
                  ${total.toFixed(4)}
                  {insufficient && (
                    <span className="ml-2 text-xs text-accent-danger">Insufficient balance</span>
                  )}
                </div>
              </div>

              {/* Low balance alert */}
              {insufficient && (
                <div
                  role="alert"
                  className="mt-2 rounded-md border border-accent-danger/40 bg-accent-danger/10 p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-accent-danger">Low balance</p>
                      <p className="text-foreground-muted text-xs mt-1">
                        You do not have enough funds to place this trade.
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <a
                        href="https://www.stellar.org/lumens/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-md bg-accent-market px-3 py-1 text-xs font-medium text-foreground hover:opacity-90
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
                      >
                        Top up
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Position limit warning */}
              {exceedsPositionLimit && positionLimitInUSD !== null && (
                <div
                  role="alert"
                  className="mt-2 rounded-md border border-accent-warning/40 bg-accent-warning/10 p-3 text-sm"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 text-accent-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-accent-warning">Position limit exceeded</p>
                      <p className="text-foreground-muted text-xs mt-1">
                        This trade (${total.toFixed(2)}) exceeds your {positionLimitPercentage}% position limit (${positionLimitInUSD.toFixed(2)}). Reduce the amount or disable position limits.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stop-loss slider */}
              <div>
                <div className="flex justify-between text-xs text-foreground-muted mb-1">
                  <label htmlFor="stop-loss-slider">Stop-Loss</label>
                  <span className="text-accent-warning font-medium" aria-hidden="true">
                    -{stopLoss}%
                  </span>
                </div>
                <input
                  id="stop-loss-slider"
                  type="range"
                  min={1}
                  max={50}
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  aria-valuemin={1}
                  aria-valuemax={50}
                  aria-valuenow={stopLoss}
                  aria-valuetext={`${stopLoss}% stop-loss`}
                  aria-describedby="stop-loss-help"
                  className="w-full accent-[hsl(var(--accent-warning))]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface rounded"
                />
                <span id="stop-loss-help" className="sr-only">
                  Set the percentage loss at which to automatically sell. Currently set to{" "}
                  {stopLoss} percent.
                </span>
              </div>

              {/* Position limit toggle */}
              <div className="flex items-center justify-between">
                <span
                  id="position-limit-label"
                  className="text-sm text-foreground flex items-center gap-1"
                >
                  Position Limit
                  <Info size={13} className="text-foreground-subtle" aria-hidden="true" />
                </span>
                <button
                  role="switch"
                  aria-checked={positionLimit}
                  aria-labelledby="position-limit-label"
                  aria-describedby="position-limit-help"
                  onClick={() => setPositionLimit((v) => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface
                    ${positionLimit ? "bg-primary" : "bg-foreground/15"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-foreground shadow transition-transform ${
                      positionLimit ? "translate-x-5" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <span id="position-limit-help" className="sr-only">
                  Position limit helps manage risk by limiting the size of your position
                </span>
              </div>
            </div>

            {/* Fee disclosure */}
            <FeeDisclosurePanel tradeTotal={total} className="mt-4" />

            {/* Fee breakdown */}
            <div className="mt-4 rounded-lg bg-white/3 border border-white/6 px-3 py-3 text-sm sm:px-4">
              <div className="flex items-center justify-between">
                <span className="text-foreground-subtle">
                  Trade fee ({(tradeFeePercent * 100).toFixed(2)}%)
                </span>
                <span className="font-mono font-medium">${tradeFee.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-foreground-subtle">Network fee</span>
                <span className="font-mono font-medium">
                  {networkFee} (~${networkFeeUSDC.toFixed(6)})
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 border-t pt-2">
                <span className="text-foreground-subtle">Net amount</span>
                <span className="font-mono font-medium">${netAmount.toFixed(4)}</span>
              </div>
            </div>

            {/* Footer metrics */}
            <div className="mt-5 rounded-lg bg-white/5 border border-white/10 px-3 py-3 grid grid-cols-3 gap-1 text-center text-xs sm:px-4 sm:gap-2">
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

            {/* Slippage warning — non-blocking, shown inline before confirm */}
            <SlippageWarning
              slippage={estimatedSlippage}
              threshold={SLIPPAGE_THRESHOLD}
              onConfirm={() => setSlippageAcknowledged(true)}
              onCancel={onClose}
            />

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={disabled}
              aria-disabled={disabled}
              aria-describedby="confirm-button-help"
              aria-busy={submitting}
              className={`mt-4 w-full rounded-xl py-3 text-sm font-semibold transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface
                ${
                  disabled
                    ? "bg-foreground/10 text-foreground-subtle cursor-not-allowed"
                    : type === "MARKET"
                    ? "bg-accent-market hover:opacity-90 text-foreground"
                    : "bg-primary hover:opacity-90 text-primary-foreground"
                }`}
            >
              {submitting
                ? "Submitting…"
                : `Confirm ${type === "LIMIT" ? "Limit" : "Market"} Order`}
            </button>
            <span id="confirm-button-help" className="sr-only">
              {disabled
                ? insufficient
                  ? "Cannot place order: insufficient balance"
                  : exceedsPositionLimit
                  ? `Cannot place order: exceeds position limit of $${positionLimitInUSD?.toFixed(2)}`
                  : "Cannot place order: please fill in all required fields"
                : `Place ${type.toLowerCase()} order for ${amount || 0} XLM at ${
                    type === "MARKET" ? "market price" : `${limitPrice || 0} USDC`
                  }. Press Enter to confirm.`}
            </span>

            {/* Keyboard shortcut hint */}
            <p className="mt-2 text-center text-xs text-foreground-subtle" aria-hidden="true">
              <kbd className="font-mono">Esc</kbd> to cancel ·{" "}
              <kbd className="font-mono">Enter</kbd> to confirm
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
