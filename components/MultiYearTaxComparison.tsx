"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TaxJurisdiction, TaxableTransaction } from "@/lib/taxUtils";
import {
  buildMultiYearSummaries,
  formatCoveredYears,
} from "@/lib/taxYearComparison";

export interface MultiYearTaxComparisonProps {
  transactions: TaxableTransaction[];
  availableYears: number[];
  jurisdiction: TaxJurisdiction;
  /** Default selected years (usually current + previous) */
  defaultYears?: number[];
}

/**
 * Optional multi-year comparison summarizing totals across selected years (#351).
 */
export function MultiYearTaxComparison({
  transactions,
  availableYears,
  jurisdiction,
  defaultYears,
}: MultiYearTaxComparisonProps) {
  const [enabled, setEnabled] = useState(false);
  const [selectedYears, setSelectedYears] = useState<number[]>(
    defaultYears ?? availableYears.slice(0, 2)
  );

  const summaries = useMemo(
    () =>
      enabled
        ? buildMultiYearSummaries(transactions, selectedYears, jurisdiction)
        : [],
    [enabled, transactions, selectedYears, jurisdiction]
  );

  function toggleYear(year: number) {
    setSelectedYears((prev) =>
      prev.includes(year)
        ? prev.filter((y) => y !== year)
        : [...prev, year].sort((a, b) => b - a)
    );
  }

  return (
    <Card data-testid="multi-year-tax-comparison">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Multi-year comparison
          </h3>
          <p className="text-xs text-foreground-muted">
            Compare totals across selected tax years
            {enabled && selectedYears.length > 0
              ? ` (${formatCoveredYears(selectedYears)})`
              : ""}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            data-testid="multi-year-toggle"
            aria-label="Enable multi-year comparison"
          />
          Enable
        </label>
      </CardHeader>

      {enabled && (
        <CardContent className="px-4 pb-4 space-y-3">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Select years to compare"
          >
            {availableYears.map((y) => {
              const on = selectedYears.includes(y);
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => toggleYear(y)}
                  aria-pressed={on}
                  data-testid={`year-chip-${y}`}
                  className={cn(
                    "px-3 py-1 rounded text-sm font-medium border transition-colors",
                    on
                      ? "bg-blue-500/20 border-blue-400 text-blue-200"
                      : "bg-background border-border text-foreground-muted"
                  )}
                >
                  {y}
                </button>
              );
            })}
          </div>

          {summaries.length === 0 ? (
            <p className="text-sm text-foreground-muted">
              Select at least one year to compare.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full text-xs"
                aria-label={`Tax comparison for ${formatCoveredYears(
                  selectedYears
                )}`}
              >
                <thead>
                  <tr className="border-b border-border text-foreground-muted">
                    <th className="pb-2 text-left font-medium pr-4">Year</th>
                    <th className="pb-2 text-right font-medium pr-4">Trades</th>
                    <th className="pb-2 text-right font-medium pr-4">
                      Net Gain/Loss
                    </th>
                    <th className="pb-2 text-right font-medium pr-4">Fees</th>
                    <th className="pb-2 text-right font-medium">Est. Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((s) => (
                    <tr
                      key={s.year}
                      className="border-b border-border/50 last:border-0"
                      data-testid={`year-summary-${s.year}`}
                    >
                      <td className="py-2 pr-4 font-medium">{s.year}</td>
                      <td className="py-2 pr-4 text-right">{s.tradeCount}</td>
                      <td
                        className={cn(
                          "py-2 pr-4 text-right font-medium",
                          s.netGainLoss >= 0 ? "text-green-400" : "text-red-400"
                        )}
                      >
                        {s.netGainLoss >= 0 ? "+" : ""}$
                        {Math.abs(s.netGainLoss).toFixed(2)}
                      </td>
                      <td className="py-2 pr-4 text-right text-foreground-muted">
                        ${s.totalFees.toFixed(4)}
                      </td>
                      <td className="py-2 text-right">
                        ${s.estimatedTaxLiability.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
