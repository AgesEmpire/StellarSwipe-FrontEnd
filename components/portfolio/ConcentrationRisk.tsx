"use client";

import { usePortfolioStore } from "@/store/usePortfolioStore";
import { BarChart2, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetConcentration {
  symbol: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export function PortfolioConcentrationRisk() {
  const { assets, totalValue } = usePortfolioStore();

  if (!assets || assets.length === 0) {
    return null;
  }

  // Calculate concentration for each asset
  const concentrations: AssetConcentration[] = assets.map((asset) => ({
    symbol: asset.symbol,
    name: asset.name,
    value: asset.value,
    percentage: totalValue > 0 ? Math.round((asset.value / totalValue) * 1000) / 10 : 0,
    color: asset.color,
  }));

  // Sort by percentage descending
  concentrations.sort((a, b) => b.percentage - a.percentage);

  // Find the highest concentration
  const highestConcentration = concentrations[0];
  const threshold = 25; // 25% threshold

  // Assets exceeding the threshold
  const highConcentrationAssets = concentrations.filter(
    (a) => a.percentage >= threshold
  );

  // Assets below threshold (for "remaining" summary)
  const otherAssets = concentrations.filter(
    (a) => a.percentage < threshold && a.percentage > 0
  );

  const totalOtherPercentage =
    otherAssets.reduce((sum, a) => sum + a.percentage, 0);

  const hasIncompleteData = totalValue === 0 && assets.length > 0;

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      {hasIncompleteData && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-300">
            Portfolio value is incomplete — quotes may be stale. Refresh to get
            accurate concentration data.
          </p>
        </div>
      )}

      {/* High Concentration Warning */}
      {highConcentrationAssets.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-sm text-amber-300 font-medium">
            ⚠️ {"Your portfolio has " +
            highConcentrationAssets.length +
            (highConcentrationAssets.length > 1 ? " major" : " ") +
            "concentration" +
            (highConcentrationAssets.length > 1 ? "s" : "") +
            (highConcentrationAssets.some((a) => a.percentage >= 50)
              ? " — exceeds 50% threshold"
              : "") +
            ". Consider diversifying."}
          </p>
        </div>
      )}

      {/* Concentration Details */}
      <div>
        <p className="text-xs uppercase tracking-widest text-foreground-muted mb-3">
          Portfolio concentration
        </p>

        {/* High concentration assets */}
        {highConcentrationAssets.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {highConcentrationAssets.map((asset) => (
              <div
                key={asset.symbol}
                className="flex items-center justify-between px-3 py-2 bg-white/5 rounded"
              >
                <span className="font-medium text-sm">{asset.symbol}</span>
                <div>
                  <span className="text-xs text-foreground-muted">
                    {asset.percentage}%
                  </span>
                  <BarChart2
                    size={12}
                    className="text-amber-400"
                    aria-hidden="true"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Other assets summary */}
        {otherAssets.length > 0 && (
          <div className="mt-3 p-3 bg-white/5 rounded">
            <p className="text-xs text-foreground-muted">
              {"Other assets (" +
              otherAssets.length +
              "}) total " +
              totalOtherPercentage}%
            </p>
          </div>
        )}

        {/* Total breakdown */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-foreground-muted mb-2">
            Total portfolio value:{" "}
            <span className="font-medium text-foreground">
              ${totalValue.toLocaleString(
                undefined,
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}
            </span>
          </p>
          {highConcentrationAssets.length > 0 && (
            <p className="text-xs text-foreground-muted">
              {"Highest concentration: " +
              highConcentrationAssets[0].symbol +
              " at " +
              highConcentrationAssets[0].percentage}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}