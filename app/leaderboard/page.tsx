"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { SignalProvider } from "@/lib/types";
import { Loader2, ChevronUp, ChevronDown, Keyboard } from "lucide-react";
import {
  useLeaderboard,
  type LeaderboardTimeRange,
} from "@/hooks/useLeaderboard";
import { SignalProvider } from "@/lib/types";
import { ChevronUp, ChevronDown, Trophy } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { LeaderboardErrorBoundary } from "@/components/LeaderboardErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

type SortField = "rank" | "overallScore" | "winRate" | "recentPerformance";
type SortDirection = "asc" | "desc";

// #595: documented, collision-free row action shortcuts for the leaderboard table
const ROW_SHORTCUTS = [
  { keys: "↑ / ↓", action: "Move focus between rows" },
  { keys: "Enter", action: "Open the focused provider's profile" },
  { keys: "C", action: "Copy the focused provider's address" },
const TIME_RANGE_TABS: { value: LeaderboardTimeRange; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "all-time", label: "All Time" },
];

export default function LeaderboardPage() {
  return (
    <LeaderboardErrorBoundary>
      <LeaderboardPageInner />
    </LeaderboardErrorBoundary>
  );
}

function LeaderboardPageInner() {
  const router = useRouter();
  const {
    data: providers,
    isLoading,
    error,
    timeRange,
    setTimeRange,
    refetch,
  } = useLeaderboard();
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const tbodyRef = useRef<HTMLTableSectionElement | null>(null);

  const sortedProviders = useMemo(() => {
    if (!providers) return [];
    const sorted = [...providers];
    sorted.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [providers, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const truncateAddress = (address: string) => {
    return address.length > 20
      ? `${address.slice(0, 10)}...${address.slice(-8)}`
      : address;
  };

  const SortHeader = ({
    field,
    label,
    className = "",
  }: {
    field: SortField;
    label: string;
    className?: string;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 hover:text-foreground transition-colors ${
        sortField === field ? "text-foreground" : "text-muted-foreground"
      } ${className}`}
      aria-label={`Sort by ${label}: ${
        sortField === field
          ? sortDirection === "asc"
            ? "ascending"
            : "descending"
          : "not sorted"
      }`}
    >
      {label}
      {sortField === field &&
        (sortDirection === "asc" ? (
          <ChevronUp size={14} aria-hidden="true" />
        ) : (
          <ChevronDown size={14} aria-hidden="true" />
        ))}
    </button>
  );

  if (isLoading) {
    return (
      <PageTransition>
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 sm:gap-8 sm:p-8 bg-gray-950">
          <LoadingState label="Loading leaderboard…" />
        </main>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 sm:gap-8 sm:p-8 bg-gray-950">
          <ErrorState
            title="Failed to load leaderboard"
            description="We couldn't reach the leaderboard service. Please try again."
            onRetry={() => refetch()}
          />
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col gap-6 p-4 sm:gap-8 sm:p-8 bg-gray-950">
        <header className="w-full flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Leaderboard</h1>
            <p className="text-sm text-gray-400 mt-2">Top-performing signal providers</p>
          </div>
          <button
            type="button"
            onClick={() => setShortcutsOpen((v) => !v)}
            aria-expanded={shortcutsOpen}
            aria-controls="leaderboard-shortcuts-help"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-white/20 hover:text-white transition-colors"
          >
            <Keyboard size={13} aria-hidden="true" />
            Shortcuts
          </button>
        </header>
    <>
      <PageTransition>
        <main className="flex min-h-screen flex-col gap-6 p-4 sm:gap-8 sm:p-8 bg-gray-950">
          <header className="w-full">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Leaderboard
            </h1>
            <p className="text-sm text-gray-400 mt-2">
              Top-performing signal providers
            </p>
          </header>

        {shortcutsOpen && (
          <div
            id="leaderboard-shortcuts-help"
            role="note"
            aria-label="Keyboard shortcuts for table rows"
            className="w-full rounded-lg border bg-card p-4 text-sm"
          >
            <p className="mb-2 font-semibold text-foreground">Row shortcuts</p>
            <ul className="space-y-1">
              {ROW_SHORTCUTS.map((s) => (
                <li key={s.keys} className="flex items-center gap-2 text-muted-foreground">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                    {s.keys}
                  </kbd>
                  <span>{s.action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="w-full overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Signal provider leaderboard, sorted by {sortField} ({sortDirection === "asc" ? "ascending" : "descending"}). Activate a row to view that provider&apos;s profile.
            </caption>
            <thead>
              <tr className="border-b bg-muted/50">
                <th scope="col" aria-sort={sortField === "rank" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"} className="px-4 py-3 text-left font-semibold text-foreground">
                  <SortHeader field="rank" label="Rank" />
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-foreground">Provider</th>
                <th scope="col" aria-sort={sortField === "overallScore" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"} className="px-4 py-3 text-right font-semibold text-foreground">
                  <SortHeader field="overallScore" label="Score" className="justify-end" />
                </th>
                <th scope="col" aria-sort={sortField === "winRate" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"} className="px-4 py-3 text-right font-semibold text-foreground">
                  <SortHeader field="winRate" label="Win Rate" className="justify-end" />
                </th>
                <th scope="col" aria-sort={sortField === "recentPerformance" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"} className="px-4 py-3 text-right font-semibold text-foreground">
                  <SortHeader field="recentPerformance" label="Recent" className="justify-end" />
                </th>
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {sortedProviders.map((provider) => (
                <tr
                  key={provider.id}
                  className="border-b hover:bg-muted/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  onClick={() => router.push(`/provider/${provider.id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    // Never hijack keystrokes meant for a focused form field.
                    const tag = (e.target as HTMLElement).tagName;
                    if (tag === "INPUT" || tag === "TEXTAREA") return;

                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/provider/${provider.id}`);
                      return;
                    }

                    if (e.key === "c" || e.key === "C") {
                      e.preventDefault();
                      navigator.clipboard?.writeText(provider.address).then(() => {
                        toast.success("Address copied");
                      }).catch(() => {
                        toast.error("Couldn't copy address");
                      });
                      return;
                    }

                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      const rows = Array.from(
                        tbodyRef.current?.querySelectorAll<HTMLElement>("tr[tabindex]") ?? []
                      );
                      const idx = rows.indexOf(e.currentTarget);
                      const next = e.key === "ArrowDown" ? rows[idx + 1] : rows[idx - 1];
                      next?.focus();
                    }
                  }}
                  aria-label={`View profile for ${provider.name || provider.address}. Press C to copy address, arrow keys to move between rows.`}
                >
                  <td className="px-4 py-3 font-semibold text-foreground">#{provider.rank}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {provider.name && (
                        <p className="font-medium text-foreground">{provider.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground font-mono">
                        {truncateAddress(provider.address)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">
                    {provider.overallScore}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">
                    {provider.winRate}%
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${
                    provider.recentPerformance >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {provider.recentPerformance >= 0 ? "+" : ""}{provider.recentPerformance}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          <div
            className="flex gap-1 border-b border-border"
            role="tablist"
            aria-label="Leaderboard time range"
          >
            {TIME_RANGE_TABS.map((tab) => (
              <button
                key={tab.value}
                role="tab"
                aria-selected={timeRange === tab.value}
                onClick={() => setTimeRange(tab.value)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  timeRange === tab.value
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-full overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    <SortHeader field="rank" label="Rank" />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Provider
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">
                    <SortHeader
                      field="overallScore"
                      label="Score"
                      className="justify-end"
                    />
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">
                    <SortHeader
                      field="winRate"
                      label="Win Rate"
                      className="justify-end"
                    />
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">
                    <SortHeader
                      field="recentPerformance"
                      label="Recent"
                      className="justify-end"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedProviders.map((provider) => (
                  <tr
                    key={provider.id}
                    className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/provider/${provider.id}`)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/provider/${provider.id}`);
                      }
                    }}
                    aria-label={`View profile for ${
                      provider.name || provider.address
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-foreground">
                      #{provider.rank}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {provider.name && (
                          <p className="font-medium text-foreground">
                            {provider.name}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground font-mono">
                          {truncateAddress(provider.address)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">
                      {provider.overallScore}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {provider.winRate}%
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        provider.recentPerformance >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {provider.recentPerformance >= 0 ? "+" : ""}
                      {provider.recentPerformance}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedProviders.length === 0 && (
            <EmptyState
              title="No providers available"
              description="Once signal providers appear on the leaderboard, they'll show up here."
              icon={<Trophy className="h-7 w-7 text-muted-foreground" />}
              className="py-10"
            />
          )}
        </main>
      </PageTransition>
      <ScrollToTop />
    </>
  );
}
