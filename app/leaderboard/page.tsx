"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useLeaderboardStore } from "@/store/useLeaderboardStore";
import { PageTransition } from "@/components/PageTransition";
import { LeaderboardFilters } from "@/components/leaderboard/LeaderboardFilters";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { LeaderboardPodium } from "@/components/leaderboard/LeaderboardPodium";
import { Loader2, Trophy } from "lucide-react";
import type { RankingPeriod, MarketType } from "@/lib/leaderboard";

export default function LeaderboardPage() {
  const router = useRouter();
  const { period, marketFilter, activeTab, setPeriod, setMarketFilter, setActiveTab } =
    useLeaderboardStore();
  const { data: entries, isLoading, error } = useLeaderboard();

  const top3 = useMemo(() => (entries ?? []).slice(0, 3), [entries]);
  const rest = useMemo(() => (entries ?? []).slice(3), [entries]);

  if (isLoading) {
    return (
      <PageTransition>
        <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950">
          <p className="text-red-500">Failed to load leaderboard. Please try again.</p>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col gap-6 p-4 sm:gap-8 sm:p-8 bg-gray-950 max-w-5xl mx-auto w-full">
        {/* Header */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-500/10 p-2">
              <Trophy className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Leaderboard
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Top-performing traders &amp; signal providers
              </p>
            </div>
          </div>
        </header>

        {/* Tab switcher: Providers vs Traders */}
        <div
          role="tablist"
          aria-label="Leaderboard type"
          className="flex rounded-xl bg-muted/40 p-1 gap-1 w-fit"
        >
          {(["providers", "traders"] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                ${activeTab === tab
                  ? "bg-card text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {tab === "providers" ? "Signal Providers" : "Portfolio Traders"}
            </button>
          ))}
        </div>

        {/* Filters */}
        <LeaderboardFilters
          period={period}
          marketFilter={marketFilter}
          onPeriodChange={setPeriod}
          onMarketFilterChange={setMarketFilter}
        />

        {/* Podium — top 3 */}
        {top3.length >= 3 && (
          <LeaderboardPodium
            entries={top3}
            onViewProfile={(id) => router.push(`/provider/${id}`)}
          />
        )}

        {/* Full table */}
        <LeaderboardTable
          entries={rest}
          activeTab={activeTab}
          onViewProfile={(id) => router.push(`/provider/${id}`)}
        />

        {(entries ?? []).length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No entries found for the selected filters.</p>
          </div>
        )}
      </main>
    </PageTransition>
  );
}
