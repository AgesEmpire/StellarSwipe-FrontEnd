'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

export interface PartialClosePosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice?: number;
  status: 'open' | 'closed';
}

export interface PartialCloseRequest {
  positionId: string;
  amount: number;
  percentage: number;
}

interface PartialCloseModalProps {
  position: PartialClosePosition;
  onClose: () => void;
  onConfirm: (request: PartialCloseRequest) => void | Promise<void>;
}

type InputMode = 'amount' | 'percentage';

function round(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function PartialCloseModal({ position, onClose, onConfirm }: PartialCloseModalProps) {
  const [mode, setMode] = useState<InputMode>('amount');
  const [amountInput, setAmountInput] = useState('');
  const [percentageInput, setPercentageInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const price = position.markPrice ?? position.entryPrice;

  const amount = useMemo(() => {
    const parsed = Number.parseFloat(amountInput);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amountInput]);

  const percentage = useMemo(() => {
    const parsed = Number.parseFloat(percentageInput);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [percentageInput]);

  const effectiveAmount = mode === 'amount' ? amount : round((position.size * percentage) / 100);
  const effectivePercentage = mode === 'percentage' ? percentage : position.size > 0 ? round((amount / position.size) * 100, 4) : 0;

  const amountError = useMemo(() => {
    if (mode !== 'amount' || amountInput.trim() === '') return null;
    if (!Number.isFinite(amount) || amount <= 0) return 'Enter an amount greater than zero.';
    if (amount > position.size) return `Amount exceeds position size of ${position.size}.`;
    return null;
  }, [mode, amountInput, amount, position.size]);

  const percentageError = useMemo(() => {
    if (mode !== 'percentage' || percentageInput.trim() === '') return null;
    if (!Number.isFinite(percentage) || percentage <= 0) return 'Enter a percentage greater than zero.';
    if (percentage > 100) return 'Percentage cannot exceed 100%.';
    return null;
  }, [mode, percentageInput, percentage]);

  const isValid =
    effectiveAmount > 0 &&
    effectiveAmount <= position.size &&
    effectivePercentage > 0 &&
    effectivePercentage <= 100 &&
    !amountError &&
    !percentageError;

  const handleConfirm = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm({
        positionId: position.id,
        amount: round(effectiveAmount),
        percentage: round(effectivePercentage, 4),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Partial close {position.symbol}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-sm text-neutral-500">
          Position size: {position.size} {position.symbol} · {position.side} · mark {price}
        </p>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('amount')}
            className={`flex-1 rounded px-3 py-1.5 text-sm ${mode === 'amount' ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-neutral-100 dark:bg-neutral-800'}`}
          >
            Amount
          </button>
          <button
            type="button"
            onClick={() => setMode('percentage')}
            className={`flex-1 rounded px-3 py-1.5 text-sm ${mode === 'percentage' ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-neutral-100 dark:bg-neutral-800'}`}
          >
            Percentage
          </button>
        </div>

        {mode === 'amount' ? (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium" htmlFor="partial-close-amount">
              Amount ({position.symbol})
            </label>
            <input
              id="partial-close-amount"
              type="number"
              inputMode="decimal"
              min="0"
              max={position.size}
              step="any"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            {amountError ? (
              <p className="mt-1 text-xs text-red-500">{amountError}</p>
            ) : (
              <p className="mt-1 text-xs text-neutral-500">
                ≈ {effectivePercentage}% of position · ≈ {round(effectiveAmount * price, 2)} value
              </p>
            )}
          </div>
        ) : (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium" htmlFor="partial-close-percentage">
              Percentage (%)
            </label>
            <input
              id="partial-close-percentage"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="any"
              value={percentageInput}
              onChange={(e) => setPercentageInput(e.target.value)}
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            {percentageError ? (
              <p className="mt-1 text-xs text-red-500">{percentageError}</p>
            ) : (
              <p className="mt-1 text-xs text-neutral-500">
                ≈ {round(effectiveAmount)} {position.symbol} · ≈ {round(effectiveAmount * price, 2)} value
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || submitting}
            className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {submitting ? 'Closing…' : 'Confirm partial close'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PartialCloseModal;
