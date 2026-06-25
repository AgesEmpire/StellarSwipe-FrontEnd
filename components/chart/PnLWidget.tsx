"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { usePortfolio } from "@/hooks/usePortfolio";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/i18n";

export function PnLWidget() {
  const { totalRealizedPnL, totalUnrealizedPnL, totalValue, isLoading } = usePortfolio();

  const totalPnL = totalRealizedPnL + totalUnrealizedPnL;
  const portfolioReturn = totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0;
  const isPositive = totalPnL >= 0;
  const isPositiveRealized = totalRealizedPnL >= 0;
  const isPositiveUnrealized = totalUnrealizedPnL >= 0;

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">P&L Overview</h2>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading P&L data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <h2 className="text-base font-semibold text-foreground">P&L Overview</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Total P&L with indicator */}
        <div className={cn(
          "rounded-lg p-4",
          isPositive ? "bg-accent-success/10" : "bg-accent-danger/10"
        )}>
          <div className="flex items-center gap-2 mb-2">
            {isPositive ? (
              <TrendingUp size={18} className="text-accent-success" />
            ) : (
              <TrendingDown size={18} className="text-accent-danger" />
            )}
            <p className="text-sm text-muted-foreground">Total P&L</p>
          </div>
          <p className={cn(
            "text-2xl font-bold",
            isPositive ? "text-accent-success" : "text-accent-danger"
          )}>
          {isPositive ? "+" : ""}{formatCurrency(totalPnL)}
          </p>
        </div>

        {/* Portfolio Return Percentage */}
        <div className={cn(
          "rounded-lg p-4",
          isPositive ? "bg-accent-success/10" : "bg-accent-danger/10"
        )}>
          <p className="text-sm text-muted-foreground mb-2">Portfolio Return</p>
          <p className={cn(
            "text-2xl font-bold",
            isPositive ? "text-accent-success" : "text-accent-danger"
          )}>
            {isPositive ? "+" : ""}{portfolioReturn.toFixed(2)}%
          </p>
        </div>

        {/* Realized and Unrealized breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <div className={cn(
            "rounded-lg p-3",
            isPositiveRealized ? "bg-accent-success/10" : "bg-accent-danger/10"
          )}>
            <p className="text-xs text-muted-foreground mb-1">Realized P&L</p>
            <p className={cn(
              "text-lg font-semibold",
              isPositiveRealized ? "text-accent-success" : "text-accent-danger"
            )}>
              {isPositiveRealized ? "+" : ""}{formatCurrency(totalRealizedPnL)}
            </p>
          </div>
          <div className={cn(
            "rounded-lg p-3",
            isPositiveUnrealized ? "bg-accent-success/10" : "bg-accent-danger/10"
          )}>
            <p className="text-xs text-muted-foreground mb-1">Unrealized P&L</p>
            <p className={cn(
              "text-lg font-semibold",
              isPositiveUnrealized ? "text-accent-success" : "text-accent-danger"
            )}>
              {isPositiveUnrealized ? "+" : ""}{formatCurrency(totalUnrealizedPnL)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
