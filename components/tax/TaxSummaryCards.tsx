"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TaxSummary } from "@/lib/taxReport";
import { getTaxRateInfo } from "@/lib/taxReport";
import { TrendingUp, TrendingDown, DollarSign, Receipt, BarChart2, Percent } from "lucide-react";

interface TaxSummaryCardsProps {
  summary: TaxSummary;
}

function fmt(value: number, symbol = "$") {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "-" : ""}${symbol}${formatted}`;
}

export function TaxSummaryCards({ summary }: TaxSummaryCardsProps) {
  const rates = getTaxRateInfo(summary.jurisdiction);
  const sym = rates.currencySymbol;
  const isGain = summary.totalGains >= 0;

  const cards = [
    {
      label: "Total Gains / Losses",
      value: fmt(summary.totalGains, sym),
      icon: isGain ? TrendingUp : TrendingDown,
      color: isGain ? "text-green-400" : "text-red-400",
      bg: isGain ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20",
    },
    {
      label: "Short-Term Gains",
      value: fmt(summary.shortTermGains, sym),
      icon: BarChart2,
      color: summary.shortTermGains >= 0 ? "text-orange-400" : "text-red-400",
      bg: "bg-orange-500/10 border-orange-500/20",
      sub: `Taxed at ~${(rates.shortTermRate * 100).toFixed(0)}%`,
    },
    {
      label: "Long-Term Gains",
      value: fmt(summary.longTermGains, sym),
      icon: TrendingUp,
      color: summary.longTermGains >= 0 ? "text-blue-400" : "text-red-400",
      bg: "bg-blue-500/10 border-blue-500/20",
      sub: `Taxed at ~${(rates.longTermRate * 100).toFixed(0)}%`,
    },
    {
      label: "Est. Tax Liability",
      value: fmt(summary.estimatedTaxLiability, sym),
      icon: DollarSign,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10 border-yellow-500/20",
      sub: "Preliminary estimate",
    },
    {
      label: "Total Fees",
      value: fmt(summary.totalFees, sym),
      icon: Receipt,
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
    {
      label: "Effective Tax Rate",
      value: `${(summary.effectiveTaxRate * 100).toFixed(1)}%`,
      icon: Percent,
      color: "text-sky-400",
      bg: "bg-sky-500/10 border-sky-500/20",
      sub: `${summary.winningTrades}W / ${summary.losingTrades}L trades`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className={cn("border", card.bg)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs text-muted-foreground leading-tight">{card.label}</p>
                <Icon className={cn("h-4 w-4 flex-shrink-0", card.color)} aria-hidden="true" />
              </div>
              <p className={cn("text-lg font-bold font-mono", card.color)}>{card.value}</p>
              {card.sub && (
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
