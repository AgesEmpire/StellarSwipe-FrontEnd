"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { YearOverYearData, TaxJurisdiction } from "@/lib/taxReport";
import { getTaxRateInfo } from "@/lib/taxReport";

interface TaxYearComparisonProps {
  data: YearOverYearData[];
  jurisdiction: TaxJurisdiction;
}

function fmtUSD(v: number, sym: string) {
  return `${v < 0 ? "-" : ""}${sym}${Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function TaxYearComparison({ data, jurisdiction }: TaxYearComparisonProps) {
  const { currencySymbol: sym } = getTaxRateInfo(jurisdiction);

  if (data.length === 0) return null;

  // Find max absolute gain for bar scaling
  const maxGain = Math.max(...data.map((d) => Math.abs(d.totalGains)), 1);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-foreground">Year-over-Year Comparison</h2>
        <p className="text-xs text-muted-foreground">
          Capital gains, fees, and estimated tax across all available years
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Bar chart */}
        <div
          role="img"
          aria-label="Year-over-year gains bar chart"
          className="flex items-end gap-3 h-32"
        >
          {data.map((d) => {
            const height = Math.max(4, (Math.abs(d.totalGains) / maxGain) * 100);
            const isGain = d.totalGains >= 0;
            return (
              <div key={d.year} className="flex flex-col items-center gap-1 flex-1">
                <span className={cn("text-xs font-mono font-semibold", isGain ? "text-green-400" : "text-red-400")}>
                  {fmtUSD(d.totalGains, sym)}
                </span>
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all",
                    isGain ? "bg-green-500/60" : "bg-red-500/60"
                  )}
                  style={{ height: `${height}%` }}
                  title={`${d.year}: ${fmtUSD(d.totalGains, sym)}`}
                />
                <span className="text-xs text-muted-foreground">{d.year}</span>
              </div>
            );
          })}
        </div>

        {/* Data table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Year-over-year tax data">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left text-xs font-medium text-muted-foreground">Year</th>
                <th className="py-2 text-right text-xs font-medium text-muted-foreground">ST Gains</th>
                <th className="py-2 text-right text-xs font-medium text-muted-foreground">LT Gains</th>
                <th className="py-2 text-right text-xs font-medium text-muted-foreground">Total</th>
                <th className="py-2 text-right text-xs font-medium text-muted-foreground">Fees</th>
                <th className="py-2 text-right text-xs font-medium text-muted-foreground">Est. Tax</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.year} className="border-b hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 font-semibold text-foreground">{d.year}</td>
                  <td className={cn("py-2.5 text-right font-mono text-xs",
                    d.shortTermGains >= 0 ? "text-orange-400" : "text-red-400")}>
                    {fmtUSD(d.shortTermGains, sym)}
                  </td>
                  <td className={cn("py-2.5 text-right font-mono text-xs",
                    d.longTermGains >= 0 ? "text-blue-400" : "text-red-400")}>
                    {fmtUSD(d.longTermGains, sym)}
                  </td>
                  <td className={cn("py-2.5 text-right font-mono font-semibold",
                    d.totalGains >= 0 ? "text-green-400" : "text-red-400")}>
                    {d.totalGains >= 0 ? "+" : ""}{fmtUSD(d.totalGains, sym)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-xs text-muted-foreground">
                    {fmtUSD(d.totalFees, sym)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-xs text-yellow-400">
                    {fmtUSD(d.estimatedTax, sym)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
