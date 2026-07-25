"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit2, Save, Info } from "lucide-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { StopLossSlider } from "@/components/ui/stop-loss-slider";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import { cn } from "@/lib/utils";
import type { StopLossMode } from "@/hooks/useStopLoss";

interface PositionState {
  symbol: string;
  assetPair: string;
  entryPrice: number;
  currentPrice: number;
  highWaterMark: number;
  stopLoss: number;
  mode: StopLossMode;
  isEditing: boolean;
}

const TRAILING_TOOLTIP =
  "Trailing stop: the stop level rises automatically as the price reaches new highs, " +
  "but never falls. Fixed stop: the level is anchored to the entry price and does not move.";

export function PositionStopLossControl() {
  const { assets } = usePortfolio();
  const [positions, setPositions] = useState<PositionState[]>([]);

  useEffect(() => {
    const active = assets
      .filter((asset) => asset.value > 0)
      .map((asset, index) => {
        const entryPrice = Number((0.4 + index * 0.03).toFixed(4));
        const currentPrice = Number(
          (entryPrice * (1 + 0.06 + index * 0.01)).toFixed(4)
        );
        return {
          symbol: asset.symbol,
          assetPair: `${asset.symbol}/USDC`,
          entryPrice,
          currentPrice,
          highWaterMark: currentPrice,
          stopLoss: 8 + index * 5,
          mode: "fixed" as StopLossMode,
          isEditing: false,
        };
      });

    setPositions(active);
  }, [assets]);

  const currentValue = useMemo(
    () => positions.reduce((sum, position) => sum + position.currentPrice, 0),
    [positions]
  );

  function handleToggleEdit(symbol: string) {
    setPositions((prev) =>
      prev.map((item) =>
        item.symbol === symbol ? { ...item, isEditing: !item.isEditing } : item
      )
    );
  }

  function handleStopLossChange(symbol: string, value: number) {
    setPositions((prev) =>
      prev.map((item) =>
        item.symbol === symbol ? { ...item, stopLoss: value } : item
      )
    );
  }

  function handleModeToggle(symbol: string) {
    setPositions((prev) =>
      prev.map((item) => {
        if (item.symbol !== symbol) return item;
        const nextMode: StopLossMode =
          item.mode === "fixed" ? "trailing" : "fixed";
        return { ...item, mode: nextMode };
      })
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-foreground">
            <GlossaryTerm term="stop-loss">Stop-Loss</GlossaryTerm> Controls
          </p>
          <p className="text-sm text-muted-foreground">
            View and adjust{" "}
            <GlossaryTerm term="stop-loss">stop-loss</GlossaryTerm> levels for
            current open positions.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {positions.length} open
        </span>
      </div>

      {positions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active positions available to adjust.
        </p>
      ) : (
        <div className="space-y-4">
          {positions.map((position) => {
            const referencePrice =
              position.mode === "trailing"
                ? position.highWaterMark
                : position.entryPrice;
            const stopPrice = Number(
              (referencePrice * (1 - position.stopLoss / 100)).toFixed(4)
            );

            return (
              <div
                key={position.symbol}
                className="rounded-3xl border border-white/10 bg-background/80 p-4"
              >
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {position.assetPair}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Entry {position.entryPrice.toFixed(4)} · Current{" "}
                      {position.currentPrice.toFixed(4)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleEdit(position.symbol)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition",
                      position.isEditing
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                        : "bg-white/5 text-foreground border border-white/10 hover:bg-white/10"
                    )}
                  >
                    {position.isEditing ? (
                      <Save size={14} />
                    ) : (
                      <Edit2 size={14} />
                    )}
                    {position.isEditing ? "Save" : "Edit"}
                  </button>
                </div>

                {/* Mode toggle — fixed vs trailing */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Mode:</span>
                  <div
                    role="group"
                    aria-label="Stop-loss mode"
                    className="flex rounded-lg bg-white/5 p-0.5 text-xs"
                  >
                    {(["fixed", "trailing"] as StopLossMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() =>
                          position.isEditing &&
                          handleModeToggle(position.symbol)
                        }
                        aria-pressed={position.mode === m}
                        disabled={!position.isEditing}
                        className={cn(
                          "rounded-md px-3 py-1 font-medium capitalize transition-all",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                          position.mode === m
                            ? "bg-white/15 text-foreground shadow"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  {/* Tooltip explaining trailing vs fixed */}
                  <span
                    title={TRAILING_TOOLTIP}
                    aria-label={TRAILING_TOOLTIP}
                    className="cursor-help text-muted-foreground"
                  >
                    <Info size={13} aria-hidden="true" />
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-3">
                    <StopLossSlider
                      value={position.stopLoss}
                      onChange={(value) =>
                        handleStopLossChange(position.symbol, value)
                      }
                      entryPrice={referencePrice}
                      assetSymbol={position.symbol}
                      min={1}
                      max={50}
                      step={1}
                      disabled={!position.isEditing}
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          Stop Price
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {stopPrice.toFixed(4)} {position.symbol}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          {position.mode === "trailing"
                            ? "High-Water Mark"
                            : "Risk Metric"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {position.mode === "trailing"
                            ? `${position.highWaterMark.toFixed(4)} ${
                                position.symbol
                              }`
                            : `-${position.stopLoss}% risk window`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="hidden sm:block" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {positions.length > 0 && (
        <div className="mt-5 rounded-3xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
          <p>
            Aggregate exposure: {currentValue.toFixed(4)} total price units
            across active positions.
          </p>
          <p className="mt-2">
            Stop-loss values are preserved while the page is open and visible in
            the position summary.
          </p>
        </div>
      )}
    </section>
  );
}
