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

// #772: how long a metric's underlying data is considered fresh before it is
// surfaced as stale to the user.
const STALE_AFTER_MS = 5 * 60 * 1000;

type FreshnessState = "loading" | "fresh" | "stale" | "unavailable";

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

// #772: human-readable relative freshness, e.g. "Updated 2m ago".
function formatRelativeTime(timestamp: number, now: number): string {
  const diff = Math.max(0, now - timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// #772: exact, human-readable timestamp for assistive tech / on interaction.
function formatExactTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// #772: a compact, fixed-height freshness indicator for metric cards. The
// reserved line height keeps card dimensions stable as the label changes.
function FreshnessTimestamp({
  state,
  timestamp,
  now,
}: {
  state: FreshnessState;
  timestamp: number | null;
  now: number;
}) {
  const hasTimestamp = state !== "loading" && state !== "unavailable" && timestamp != null;
  const relative = hasTimestamp ? formatRelativeTime(timestamp, now) : null;
  const exact = hasTimestamp ? formatExactTime(timestamp) : null;

  const label =
    state === "loading"
      ? "Loading freshness…"
      : state === "unavailable"
        ? "Freshness unavailable"
        : state === "stale"
          ? `Stale · updated ${relative}`
          : `Updated ${relative}`;

  const tone =
    state === "stale"
      ? "text-amber-500"
      : state === "unavailable"
        ? "text-muted-foreground"
        : state === "loading"
          ? "text-muted-foreground"
          : "text-emerald-500";

  return (
    <span
      className={cn(
        "flex h-4 items-center gap-1 text-[11px] leading-4 tabular-nums",
        tone
      )}
      title={exact ?? undefined}
      aria-label={exact ? `${label}. Exact time: ${exact}` : label}
      data-freshness={state}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          state === "stale"
            ? "bg-amber-500"
            : state === "unavailable"
              ? "bg-muted-foreground/50"
              : state === "loading"
                ? "bg-muted-foreground/50 animate-pulse"
                : "bg-emerald-500"
        )}
      />
      <span className="truncate">{label}</span>
    </span>
  );
}

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

  // #772: track when the leaderboard data was last refreshed so metric cards
  // can surface a freshness timestamp.
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isLoading && !error && providers) {
      setLastUpdated(Date.now());
    }
  }, [isLoading, error, providers]);

  // Keep the relative label current without re-rendering on every tick.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const freshnessState: FreshnessState = isLoading
    ? "loading"
    : error || !providers
      ? "unavailable"
      : lastUpdated != null && now - lastUpdated > STALE_AFTER_MS
        ? "stale"
        : "fresh";

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

  if (isLoading) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <FreshnessTimestamp
              state={freshnessState}
              timestamp={lastUpdated}
              now={now}
            />
          </div>
          <LoadingState label="Loading leaderboard…" />
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <FreshnessTimestamp
              state={freshnessState}
              timestamp={lastUpdated}
              now={now}
            />
          </div>
          <ErrorState
            title="Failed to load leaderboard"
            description={error.message}
            onRetry={refetch}
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <FreshnessTimestamp
            state={freshnessState}
            timestamp={lastUpdated}
            now={now}
          />
        </div>

        {totalResults === 0 ? (
          <EmptyState
            title="No providers yet"
            description="Provider rankings will appear here once data is available."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      style={cellStyle(col.key)}
                      className={cn(
                        "px-3 py-2 font-medium text-muted-foreground",
                        col.align === "right" ? "text-right" : "text-left",
                        pinned.includes(col.key) && "bg-muted/40"
                      )}
                      aria-sort={
                        col.sortField && sortField === col.sortField
                          ? sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
                      <div
                        className={cn(
                          "flex items-center gap-1",
                          col.align === "right" && "justify-end"
                        )}
                      >
                        {col.sortField ? (
                          <SortHeader field={col.sortField} label={col.label} />
                        ) : (
                          <span>{col.label}</span>
                        )}
                        <PinToggle column={col} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody ref={tbodyRef}>
                {pagedProviders.map((provider, index) => (
                  <tr
                    key={provider.address}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td
                      style={cellStyle("rank")}
                      className={cn(
                        "px-3 py-2",
                        pinned.includes("rank") && "bg-background"
                      )}
                    >
                      {pageStart + index + 1}
                    </td>
                    <td
                      style={cellStyle("provider")}
                      className={cn(
                        "px-3 py-2",
                        pinned.includes("provider") && "bg-background"
                      )}
                    >
                      {provider.name ?? truncateAddress(provider.address)}
                    </td>
                    <td
                      style={cellStyle("overallScore")}
                      className={cn(
                        "px-3 py-2 text-right tabular-nums",
                        pinned.includes("overallScore") && "bg-background"
                      )}
                    >
                      {provider.overallScore.toFixed(2)}
                    </td>
                    <td
                      style={cellStyle("winRate")}
                      className={cn(
                        "px-3 py-2 text-right tabular-nums",
                        pinned.includes("winRate") && "bg-background"
                      )}
                    >
                      {(provider.winRate * 100).toFixed(1)}%
                    </td>
                    <td
                      style={cellStyle("recentPerformance")}
                      className={cn(
                        "px-3 py-2 text-right tabular-nums",
                        pinned.includes("recentPerformance") && "bg-background"
                      )}
                    >
                      {provider.recentPerformance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
