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
        <header className="w-full flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Leaderboard
              </h1>
              <p className="text-sm text-gray-400 mt-2">
                Top-performing signal providers
              </p>
            </div>

            {/* #677: always-visible, stateful sort controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div
                role="group"
                aria-label="Sort leaderboard by metric"
                className="flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1"
              >
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSort(option.value)}
                    aria-pressed={sortField === option.value}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      sortField === option.value
                        ? "bg-blue-500/15 text-blue-300"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"))
                  }
                  aria-pressed={sortDirection === "desc"}
                  aria-label={`Sorted by ${activeSortLabel} ${
                    sortDirection === "asc" ? "ascending" : "descending"
                  }. Activate to switch direction.`}
                  title={`Sorted ${sortDirection === "asc" ? "ascending" : "descending"}`}
                  className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {sortDirection === "asc" ? (
                    <ArrowUp size={13} aria-hidden="true" />
                  ) : (
                    <ArrowDown size={13} aria-hidden="true" />
                  )}
                  <span>{sortDirection === "asc" ? "Asc" : "Desc"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShortcutsOpen((v) => !v)}
                aria-expanded={shortcutsOpen}
                aria-controls="leaderboard-shortcuts-help"
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-white/20 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Keyboard size={13} aria-hidden="true" />
                Shortcuts
              </button>

              {pinned.length > 0 && (
                <button
                  type="button"
                  onClick={resetPins}
                  className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
                >
                  Reset pinned columns
                </button>
              )}
            </div>
          </div>

          {/* Time range tabs */}
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
          <p id="leaderboard-row-hint" className="sr-only">
            Press Enter to view the provider profile, C to copy the address, and
            arrow keys to move between rows.
          </p>
          <table className="w-full text-sm">
            <caption className="sr-only">
              Signal provider leaderboard for the {activeSortLabel.toLowerCase()} range,
              sorted by {activeSortLabel} (
              {sortDirection === "asc" ? "ascending" : "descending"}). Activate a
              row to view that provider&apos;s profile.
            </caption>
            <thead>
              <tr className="border-b bg-muted/50">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    // Only sortable columns carry aria-sort.
                    aria-sort={
                      !col.sortField
                        ? undefined
                        : col.sortField === sortField
                          ? sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                    }
                    className={cn(
                      "px-4 py-3 font-semibold text-foreground bg-muted/50",
                      col.align === "left" ? "text-left" : "text-right",
                      pinned.includes(col.key) && "bg-card"
                    )}
                    style={cellStyle(col.key)}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-1.5",
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
              {pagedProviders.map((provider) => (
                <tr
                  key={provider.id}
                  aria-current={provider.id === currentUser?.id ? "true" : undefined}
                  className="border-b hover:bg-muted/30 aria-[current=true]:bg-blue-500/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  onClick={() => router.push(`/provider/${provider.id}`)}
                  // Keep native row semantics so cells stay associated with
                  // their column headers; the hint is announced as a description.
                  tabIndex={0}
                  aria-describedby="leaderboard-row-hint"
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
                      navigator.clipboard
                        ?.writeText(provider.address)
                        .then(() => toast.success("Address copied"))
                        .catch(() => toast.error("Couldn't copy address"));
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
                >
                  {COLUMNS.map((col) => {
                    // The provider cell names the row for assistive tech.
                    const Cell = col.key === "provider" ? "th" : "td";
                    return (
                    <Cell
                      key={col.key}
                      scope={col.key === "provider" ? "row" : undefined}
                      className={cn(
                        "px-4 py-3 bg-card",
                        col.key === "provider" && "font-normal",
                        col.align === "right" ? "text-right" : "text-left",
                        col.key === "rank" && "font-semibold text-foreground",
                        col.key === "overallScore" &&
                          "text-right font-semibold text-green-600",
                        col.key === "winRate" && "font-semibold text-foreground",
                        col.key === "recentPerformance" &&
                          (provider.recentPerformance >= 0
                            ? "text-green-600"
                            : "text-red-600") + " font-semibold"
                      )}
                      style={cellStyle(col.key)}
                    >
                      {renderCell(col.key, provider, truncateAddress)}
                    </Cell>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedProviders.length === 0 && (
          <EmptyState
            title="No providers available"
            description="No signal providers are ranked for this time range yet. Try another range or check back soon."
            icon={<Trophy size={28} className="text-slate-400" />}
          />
        )}

        {currentUser && currentUserPage !== currentPage && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100"
            role="region"
            aria-label="Your leaderboard position"
            data-testid="leaderboard-your-position"
          >
            <span>
              Your position: <strong>#{currentUser.rank}</strong>{" "}
              {currentUser.name} — {currentUserIndex + 1} of {totalResults}
            </span>
            <button
              type="button"
              onClick={() => currentUserPage && setPage(currentUserPage)}
              className="rounded-md border border-blue-400/40 px-3 py-1 text-xs font-medium hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Go to page {currentUserPage}
            </button>
          </div>
        )}

        {/* Always rendered (even when empty) so the controls never jump. */}
        <nav
          aria-label="Leaderboard pagination"
          className="flex min-h-10 flex-wrap items-center justify-between gap-3 text-sm text-gray-400"
        >
          <p role="status" aria-live="polite" data-testid="leaderboard-page-status">
            {totalResults === 0
              ? "No results"
              : `Showing ${pageStart + 1}–${pageStart + pagedProviders.length} of ${totalResults} providers. Page ${currentPage} of ${totalPages}.`}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Previous<span className="sr-only"> page</span>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                aria-label={`Page ${n}`}
                aria-current={n === currentPage ? "page" : undefined}
                className={cn(
                  "min-w-8 rounded-md border px-2 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  n === currentPage
                    ? "border-blue-500/50 bg-blue-500/15 text-blue-300"
                    : "border-white/10 text-white hover:bg-white/5"
                )}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Next<span className="sr-only"> page</span>
            </button>
          </div>
        </nav>

        <ScrollToTop />
      </main>
    </PageTransition>
  );
}

function renderCell(
  key: ColumnKey,
  provider: SignalProvider,
  truncateAddress: (address: string) => string
) {
  switch (key) {
    case "rank":
      return `#${provider.rank}`;
    case "provider":
      return (
        <div className="flex flex-col gap-0.5">
          {provider.name && (
            <p className="font-medium text-foreground">{provider.name}</p>
          )}
          <p className="text-xs text-muted-foreground font-mono">
            {truncateAddress(provider.address)}
          </p>
        </div>
      );
    case "overallScore":
      return provider.overallScore;
    case "winRate":
      return `${provider.winRate}%`;
    case "recentPerformance":
      return `${provider.recentPerformance >= 0 ? "+" : ""}${provider.recentPerformance}%`;
    default:
      return null;
  }
}

