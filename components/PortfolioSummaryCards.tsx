"use client";

import { Card, CardContent } from "@/components/ui/card";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { TrendingUp, TrendingDown, Wallet, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PortfolioSummaryCards() {
  const { assets, totalValue, totalRealizedPnL, totalUnrealizedPnL } =
    usePortfolioStore();

  const totalPnL = totalRealizedPnL + totalUnrealizedPnL;
  const pnlPercent =
    totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0;
  const activePositions = assets.filter((a) => a.value > 0).length;
  const isPositive = totalPnL >= 0;

  const stats = [
    {
      label: "Balance",
      value: `$${totalValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: Wallet,
      className: "text-sky-400",
    },
    {
      label: "Total P/L",
      value: `${isPositive ? "+" : ""}$${Math.abs(totalPnL).toFixed(2)}`,
      sub: `${isPositive ? "+" : ""}${pnlPercent.toFixed(2)}%`,
      icon: isPositive ? TrendingUp : TrendingDown,
      className: isPositive ? "text-green-400" : "text-red-400",
    },
    {
      label: "Positions",
      value: String(activePositions),
      sub: `${assets.length} asset${assets.length !== 1 ? "s" : ""}`,
      icon: BarChart2,
      className: "text-violet-400",
    },
  ];

  return (
    <Card className="w-full">
      <CardContent className="pt-4 pb-3 px-4">
        <p className="text-xs uppercase tracking-widest text-foreground-muted mb-3">
          Portfolio snapshot
        </p>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {stats.map(({ label, value, sub, icon: Icon, className }) => (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <Icon
                  size={13}
                  className={cn("shrink-0", className)}
                  aria-hidden="true"
                />
                <span className="text-[11px] text-foreground-muted">
                  {label}
                </span>
              </div>
              <p
                className={cn("text-sm font-semibold leading-tight", className)}
              >
                {value}
              </p>
              {sub && (
                <p className="text-[11px] text-foreground-subtle">{sub}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
