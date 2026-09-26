"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Keyboard,
  Pin,
  PinOff,
  RefreshCw,
  Trophy,
} from "lucide-react";
import {
  useLeaderboard,
  type LeaderboardTimeRange,
} from "@/hooks/useLeaderboard";
import type { SignalProvider } from "@/lib/types";
import { PageTransition } from "@/components/PageTransition";
import { cn } from "@/lib/utils";
import { LeaderboardErrorBoundary } from "@/components/LeaderboardErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useWalletStore } from "@/store/useWalletStore";

const PAGE_SIZE = 10;

// #773: a view is considered stale once it is older than this threshold.
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

type SortField = "rank" | "overallScore" | "winRate" | "recentPerformance";
type SortDirection = "asc" | "desc";
type ColumnKey =
  | "rank"
  | "provider"
  | "overallScore"
  | "winRate"
  | "recentPerformance";

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  width: number;
  align: "left" | "right";
  sortField?: SortField;
}

const COLUMNS: ColumnConfig[] = [
  { key: "rank", label: "Rank", width: 72, align: "left", sortField: "rank" },
  { key: "provider", label: "Provider", width: 220, align: "left" },
  {
    key: "overallScore",
    label: "Score",
    width: 100,
    align: "right",
    sortField: "overallScore",
  },
  {
    key: "winRate",
    label: "Win Rate",
    width: 100,
    align: "right",
    sortField: "winRate",
  },
  {
    key: "recentPerformance",
    label: "Recent",
    width: 100,
    align: "right",
    sortField: "recentPerformance",
  },
];

// #595: documented, collision-free row action shortcuts for the leaderboard table
const ROW_SHORTCUTS = [
  { keys: "↑ / ↓", action: "Move focus between rows" },
  { keys: "Enter", action: "Open the focused provider's profile" },
  { keys: "C", action: "Copy the focused provider's address" },
];

const TIME_RANGE_TABS: { value: LeaderboardTimeRange; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "all-time", label: "All Time" },
];

// #677: every sortable metric gets an obvious, one-click control in the page
// header (in addition to the column headers).
const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "rank", label: "Rank" },
  { value: "overallScore", label: "Score" },
  { value: "winRate", label: "Win Rate" },
  { value: "recentPerformance", label: "Recent" },
];

// Sensible default direction per metric: rankings ascend, performance
// metrics descend (best first).
const DEFAULT_DIRECTION: Record<SortField, SortDirection> = {
  rank: "asc",
  overallScore: "desc",
  winRate: "desc",
  recentPerformance: "desc",
};

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
  const [pinned, setPinned] = useState<ColumnKey[]>([]);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const tbodyRef = useRef<HTMLTableSectionElement | null>(null);
  const [page, setPage] = useState(1);
  const publicKey = useWalletStore((s) => s.publicKey);

  // #773: track when the current view was last refreshed so we can surface a
  // stale-data badge and offer a manual refresh action.
  const [lastUpdated, setLastUpdated] = useState<number>(() => Date.now());
  const [isStale, setIsStale] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");

  // Re-evaluate staleness on an interval and whenever the dataset changes.
  useEffect(() => {
    const evaluate = () => {
      setIsStale(Date.now() - lastUpdated > STALE_THRESHOLD_MS);
    };
    evaluate();
    const timer = window.setInterval(evaluate, 30 * 1000);
    return () => window.clearInterval(timer);
  }, [lastUpdated]);

  // A successful fetch (new data or a completed refetch) resets the clock.
  useEffect(() => {
    if (!isLoading && !error) {
      setLastUpdated(Date.now());
      setIsStale(false);
    }
  }, [providers, isLoading, error]);

  const handleRefresh = async () => {
    if (refreshStatus === "pending") return;
    setRefreshStatus("pending");
    try {
      await refetch();
      setLastUpdated(Date.now());
      setIsStale(false);
      setRefreshStatus("success");
      toast.success("Leaderboard data refreshed");
    } catch {
      setRefreshStatus("error");
      toast.error("Could not refresh leaderboard data");
    } finally {
      // Return to idle shortly after so the button is reusable.
      window.setTimeout(() => setRefreshStatus("idle"), 2000);
    }
  };

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

  // Return to the first page whenever the ordering or dataset changes.
  useEffect(() => {
    setPage(1);
  }, [sortField, sortDirection, timeRange]);

  const totalResults = sortedProviders.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedProviders = sortedProviders.slice(pageStart, pageStart + PAGE_SIZE);

  const currentUserIndex = publicKey
    ? sortedProviders.findIndex((p) => p.address === publicKey)
    : -1;
  const currentUser =
    currentUserIndex >= 0 ? sortedProviders[currentUserIndex] : null;
  const currentUserPage =
    currentUserIndex >= 0 ? Math.floor(currentUserIndex / PAGE_SIZE) + 1 : null;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(DEFAULT_DIRECTION[field]);
    }
  };

  const togglePin = (key: ColumnKey) => {
    setPinned((current) =>
      current.includes(key)
        ? current.filter((k) => k !== key)
        : // Keep pinned columns in table order so sticky offsets stay contiguous.
          COLUMNS.map((c) => c.key).filter((k) => current.includes(k) || k === key)
    );
  };

  const resetPins = () => setPinned([]);

  // Left offset for each pinned column, computed from the widths of the
  // pinned columns before it (in table order).
  const pinnedOffsets = useMemo(() => {
    const offsets: Partial<Record<ColumnKey, number>> = {};
    let acc = 0;
    for (const col of COLUMNS) {
      if (pinned.includes(col.key)) {
        offsets[col.key] = acc;
        acc += col.width;
      }
    }
    return offsets;
  }, [pinned]);

  const truncateAddress = (address: string) => {
    return address.length > 20
      ? `${address.slice(0, 10)}...${address.slice(-8)}`
      : address;
  };

  const cellStyle = (key: ColumnKey): CSSProperties | undefined => {
    if (!pinned.includes(key)) return undefined;
    const isLastPinned = pinned[pinned.length - 1] === key;
    return {
      position: "sticky",
      left: pinnedOffsets[key],
      width: COLUMNS.find((c) => c.key === key)!.width,
      zIndex: 1,
      boxShadow: isLastPinned ? "2px 0 4px -2px rgba(0,0,0,0.3)" : undefined,
    };
  };

  const activeSortLabel =
    SORT_OPTIONS.find((o) => o.value === sortField)?.label ?? "rank";

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
      type="button"
      // Current sort state is exposed via aria-sort on the parent <th>.
      aria-label={`Sort by ${label}`}
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

  const PinToggle = ({ column }: { column: ColumnConfig }) => {
    const isPinned = pinned.includes(column.key);
    return (
      <button
        type="button"
        onClick={() => togglePin(column.key)}
        aria-pressed={isPinned}
        aria-label={`${isPinned ? "Unpin" : "Pin"} ${column.label} column`}
        className="rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {isPinned ? <Pin size={12} className="fill-current" /> : <PinOff size={12} />}
      </button>
    );
  };

  // #773: stale-data badge + refresh action. The badge labels the data as
  // possibly out of date (never invalid) and the button exposes pending,
  // success, and failure states. Refreshing only refetches data, so filters,
  // scroll position, and the selected tab are preserved.
  const StaleDataControls = () => (
    <div className="flex flex-wrap items-center gap-2">
      {isStale && (
        <span
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400"
        >
          <span aria-hidden="true">●</span>
          Data may be out of date
        </span>
      )}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshStatus === "pending"}
        aria-busy={refreshStatus === "pending"}
        aria-label="Refresh leaderboard data"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium transition-colors",
          "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        <RefreshCw
          size={14}
          aria-hidden="true"
          className={cn(refreshStatus === "pending" && "animate-spin")}
        />
        {refreshStatus === "pending"
          ? "Refreshing…"
          : refreshStatus === "success"
            ? "Refreshed"
            : refreshStatus === "error"
              ? "Retry refresh"
              : "Refresh"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {refreshStatus === "success"
          ? "Leaderboard data refreshed"
          : refreshStatus === "error"
            ? "Leaderboard refresh failed"
            : ""}
      </span>
    </div>
  );

  if (isLoading) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <LoadingState label="Loading leaderboard…" />
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <ErrorState
            title="Could not load the leaderboard"
            description="Please try again in a moment."
            onRetry={() => refetch()}
          />
        </div>
      </PageTransition>
    );
  }

  if (!providers || providers.length === 0) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            title="No providers yet"
            description="Leaderboard data will appear here once providers are ranked."
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Trophy size={20} aria-hidden="true" />
            <h1 className="text-xl font-semibold">Leaderboard</h1>
          </div>
          <StaleDataControls />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {TIME_RANGE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setTimeRange(tab.value)}
              aria-pressed={timeRange === tab.value}
              className={cn(
                "rounded-md px-3 py-1 text-sm transition-colors",
                timeRange === tab.value
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSort(option.value)}
              aria-pressed={sortField === option.value}
              className={cn(
                "rounded-md px-3 py-1 text-sm transition-colors",
                sortField === option.value
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
          {pinned.length > 0 && (
            <button
              type="button"
              onClick={resetPins}
              className="rounded-md px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Reset pins
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    style={cellStyle(col.key)}
                    aria-sort={
                      sortField === col.sortField
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={cn(
                      "bg-background px-3 py-2 font-medium",
                      col.align === "right" ? "text-right" : "text-left"
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.sortField ? (
                        <SortHeader field={col.sortField} label={col.label} />
                      ) : (
                        col.label
                      )}
                      <PinToggle column={col} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {pagedProviders.map((provider, index) => (
                <tr
                  key={provider.address}
                  className="border-b border-border last:border-0 hover:bg-accent/50"
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      style={cellStyle(col.key)}
                      className={cn(
                        "bg-background px-3 py-2",
                        col.align === "right" ? "text-right" : "text-left"
                      )}
                    >
                      {col.key === "rank" && pageStart + index + 1}
                      {col.key === "provider" && (
                        <button
                          type="button"
                          onClick={() => router.push(`/provider/${provider.address}`)}
                          className="hover:underline"
                        >
                          {truncateAddress(provider.address)}
                        </button>
                      )}
                      {col.key === "overallScore" && provider.overallScore}
                      {col.key === "winRate" && `${provider.winRate}%`}
                      {col.key === "recentPerformance" &&
                        provider.recentPerformance}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, totalResults)} of{" "}
            {totalResults} · sorted by {activeSortLabel}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="rounded-md border border-border px-2 py-1 disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="rounded-md border border-border px-2 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {currentUser && currentUserPage && (
          <div className="mt-4 rounded-md border border-border p-3 text-sm">
            Your rank: #{currentUserIndex + 1} (page {currentUserPage})
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShortcutsOpen((open) => !open)}
            aria-expanded={shortcutsOpen}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Keyboard size={14} aria-hidden="true" />
            Keyboard shortcuts
            {shortcutsOpen ? (
              <ChevronUp size={14} aria-hidden="true" />
            ) : (
              <ChevronDown size={14} aria-hidden="true" />
            )}
          </button>
          {shortcutsOpen && (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {ROW_SHORTCUTS.map((shortcut) => (
                <li key={shortcut.keys}>
                  <kbd className="rounded border border-border px-1">
                    {shortcut.keys}
                  </kbd>{" "}
                  {shortcut.action}
                </li>
              ))}
            </ul>
          )}
        </div>

        <ScrollToTop />
      </div>
    </PageTransition>
  );
}
