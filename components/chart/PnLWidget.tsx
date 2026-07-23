"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { usePortfolio } from "@/hooks/usePortfolio";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function PnLWidget() {
  const { totalRealizedPnL, totalUnrealizedPnL, totalValue, isLoading } =
    usePortfolio();

  const totalPnL = totalRealizedPnL + totalUnrealizedPnL;
  const portfolioReturn =
    totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0;
  const isPositive = totalPnL >= 0;
  const isPositiveRealized = totalRealizedPnL >= 0;
  const isPositiveUnrealized = totalUnrealizedPnL >= 0;

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">
            P&L Overview
          </h2>
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
        <h2 className="text-base font-semibold text-foreground">
          P&L Overview
        </h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Total P&L with indicator */}
        <div
          className={cn(
            "rounded-lg p-4",
            isPositive ? "bg-green-500/10" : "bg-red-500/10"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            {isPositive ? (
              <TrendingUp size={18} className="text-green-600" />
            ) : (
              <TrendingDown size={18} className="text-red-600" />
            )}
            <p className="text-sm text-muted-foreground">Total P&L</p>
          </div>
          <p
            className={cn(
              "text-2xl font-bold",
              isPositive ? "text-green-600" : "text-red-600"
            )}
          >
            {isPositive ? "+" : ""}
            {totalPnL.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        {/* Portfolio Return Percentage */}
        <div
          className={cn(
            "rounded-lg p-4",
            isPositive ? "bg-green-500/10" : "bg-red-500/10"
          )}
        >
          <p className="text-sm text-muted-foreground mb-2">Portfolio Return</p>
          <p
            className={cn(
              "text-2xl font-bold",
              isPositive ? "text-green-600" : "text-red-600"
            )}
          >
            {isPositive ? "+" : ""}
            {portfolioReturn.toFixed(2)}%
          </p>
        </div>

        {/* Realized and Unrealized breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className={cn(
              "rounded-lg p-3",
              isPositiveRealized ? "bg-green-500/10" : "bg-red-500/10"
            )}
          >
            <p className="text-xs text-muted-foreground mb-1">Realized P&L</p>
            <p
              className={cn(
                "text-lg font-semibold",
                isPositiveRealized ? "text-green-600" : "text-red-600"
              )}
            >
              {isPositiveRealized ? "+" : ""}
              {totalRealizedPnL.toLocaleString()}
            </p>
          </div>
          <div
            className={cn(
              "rounded-lg p-3",
              isPositiveUnrealized ? "bg-green-500/10" : "bg-red-500/10"
            )}
          >
            <p className="text-xs text-muted-foreground mb-1">Unrealized P&L</p>
            <p
              className={cn(
                "text-lg font-semibold",
                isPositiveUnrealized ? "text-green-600" : "text-red-600"
              )}
            >
              {isPositiveUnrealized ? "+" : ""}
              {totalUnrealizedPnL.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
