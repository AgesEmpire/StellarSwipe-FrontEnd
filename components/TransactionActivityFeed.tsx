"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  XCircle,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useTransactionStore } from "@/store/useTransactionStore";
import { deleteJournalEntry } from "@/lib/journalApi";
import { cn } from "@/lib/utils";
import { RelativeTimestamp } from "@/components/RelativeTimestamp";
import { EmptyState } from "@/components/ui/empty-state";
import { JournalEntryForm } from "@/components/JournalEntryForm";
import { toast } from "@/lib/toast";
import type { TransactionHistoryItem } from "@/store/useTransactionStore";

const TYPE_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "Copy Trades", value: "COPY_TRADE" },
  { label: "Swaps", value: "SWAP" },
  { label: "Manual", value: "MANUAL" },
] as const;

const OUTCOME_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Succeeded", value: "SUCCEEDED" },
  { label: "Failed", value: "FAILED" },
] as const;

const SORT_OPTIONS = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Amount (high to low)", value: "amount" },
] as const;

type JournalSortOrder = (typeof SORT_OPTIONS)[number]["value"];

const JOURNAL_FILTER_STORAGE_KEY = "journal-activity-filters-v1";

interface PersistedJournalFilters {
  typeFilter: (typeof TYPE_OPTIONS)[number]["value"];
  statusFilter: (typeof OUTCOME_OPTIONS)[number]["value"];
  sortOrder: JournalSortOrder;
}

const DEFAULT_JOURNAL_FILTERS: PersistedJournalFilters = {
  typeFilter: "ALL",
  statusFilter: "ALL",
  sortOrder: "newest",
};

function readPersistedJournalFilters(): PersistedJournalFilters {
  if (typeof window === "undefined") return DEFAULT_JOURNAL_FILTERS;
  try {
    const raw = window.localStorage.getItem(JOURNAL_FILTER_STORAGE_KEY);
    if (!raw) return DEFAULT_JOURNAL_FILTERS;
    const parsed = JSON.parse(raw) as Partial<PersistedJournalFilters>;
    return {
      typeFilter: parsed.typeFilter ?? DEFAULT_JOURNAL_FILTERS.typeFilter,
      statusFilter: parsed.statusFilter ?? DEFAULT_JOURNAL_FILTERS.statusFilter,
      sortOrder: parsed.sortOrder ?? DEFAULT_JOURNAL_FILTERS.sortOrder,
    };
  } catch {
    return DEFAULT_JOURNAL_FILTERS;
  }
}

function persistJournalFilters(filters: PersistedJournalFilters) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      JOURNAL_FILTER_STORAGE_KEY,
      JSON.stringify(filters)
    );
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

const statusStyles = {
  PENDING: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
  SUCCEEDED: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  FAILED: "bg-red-500/10 text-red-300 border-red-500/20",
};

const outcomeLabels = {
  WIN: "Win",
  LOSS: "Loss",
  PENDING: "Pending",
};

export function TransactionActivityFeed() {
  const history = useTransactionStore((state) => state.history);
  const pendingIds = useTransactionStore((state) => state.pendingIds);
  const failedIds = useTransactionStore((state) => state.failedIds);
  const updateTransactionStatus = useTransactionStore(
    (state) => state.updateTransactionStatus
  );
  const removeTransaction = useTransactionStore(
    (state) => state.removeTransaction
  );
  const markPending = useTransactionStore((state) => state.markPending);
  const clearPending = useTransactionStore((state) => state.clearPending);
  const markFailed = useTransactionStore((state) => state.markFailed);
  const clearFailed = useTransactionStore((state) => state.clearFailed);
  const addTransaction = useTransactionStore((state) => state.addTransaction);

  const [typeFilter, setTypeFilter] =
    useState<(typeof TYPE_OPTIONS)[number]["value"]>("ALL");
  const [statusFilter, setStatusFilter] =
    useState<(typeof OUTCOME_OPTIONS)[number]["value"]>("ALL");
  const [sortOrder, setSortOrder] = useState<JournalSortOrder>("newest");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Restore persisted filter/sort state on mount so it survives navigation and refresh.
  useEffect(() => {
    const persisted = readPersistedJournalFilters();
    setTypeFilter(persisted.typeFilter);
    setStatusFilter(persisted.statusFilter);
    setSortOrder(persisted.sortOrder);
  }, []);

  // Keep persisted state in sync whenever the user changes a filter or sort control.
  useEffect(() => {
    persistJournalFilters({ typeFilter, statusFilter, sortOrder });
  }, [typeFilter, statusFilter, sortOrder]);

  // Simulate pending→success/failure transitions (existing behavior)
  useEffect(() => {
    const pending = history.filter((item) => item.status === "PENDING");
    if (pending.length === 0) return;

    const timer = window.setTimeout(() => {
      const item = pending[0];
      const nextStatus = Math.random() > 0.25 ? "SUCCEEDED" : "FAILED";
      const nextOutcome = nextStatus === "SUCCEEDED" ? "WIN" : "LOSS";
      updateTransactionStatus(item.id, nextStatus, nextOutcome);
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [history, updateTransactionStatus]);

  // ── Delete handler with optimistic update + rollback ───────────────

  const handleDelete = useCallback(
    async (entry: TransactionHistoryItem) => {
      setDeletingId(entry.id);
      // Optimistic: remove from list immediately
      removeTransaction(entry.id);

      try {
        await deleteJournalEntry(entry.id);
        toast.success("Entry deleted", {
          description: `${entry.assetPair} removed from journal.`,
          duration: 2500,
        });
      } catch (err) {
        // Rollback on failure: re-add the entry
        addTransaction(entry);
        const message =
          err instanceof Error ? err.message : "Failed to delete entry.";
        toast.error("Delete failed", {
          description: message,
          duration: 4000,
          action: {
            label: "Retry",
            onClick: () => {
              removeTransaction(entry.id);
              deleteJournalEntry(entry.id)
                .then(() => {
                  toast.success("Entry deleted");
                })
                .catch(() => {
                  addTransaction(entry);
                  toast.error("Still unable to delete");
                });
            },
          },
        });
      } finally {
        setDeletingId(null);
      }
    },
    [removeTransaction, addTransaction]
  );

  const filtered = useMemo(() => {
    const matches = history
      .filter((item) => typeFilter === "ALL" || item.type === typeFilter)
      .filter((item) => statusFilter === "ALL" || item.status === statusFilter);

    return [...matches].sort((a, b) => {
      if (sortOrder === "oldest") return a.timestamp - b.timestamp;
      if (sortOrder === "amount")
        return parseFloat(b.amount) - parseFloat(a.amount);
      return b.timestamp - a.timestamp;
    });
  }, [history, typeFilter, statusFilter, sortOrder]);

  const hasActiveFilters =
    typeFilter !== "ALL" || statusFilter !== "ALL" || sortOrder !== "newest";

  const clearFilters = useCallback(() => {
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setSortOrder("newest");
  }, []);

  // ── Editing state ─────────────────────────────────────────────────

  const editEntry = editingId
    ? history.find((item) => item.id === editingId) ?? null
    : null;

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Transaction Activity
          </p>
          <p className="text-xs text-muted-foreground">
            Recent copy trades, status updates, and history in one place.
          </p>
        </div>
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter and sort journal activity"
        >
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Type
          </label>
          <select
            value={typeFilter}
            aria-label="Filter by transaction type"
            onChange={(e) =>
              setTypeFilter(
                e.target.value as (typeof TYPE_OPTIONS)[number]["value"]
              )
            }
            className="rounded-full border border-white/10 bg-background/80 px-3 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Filter by status"
          >
            {OUTCOME_OPTIONS.map((option) => {
              const selected = statusFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    selected
                      ? "border-blue-400/40 bg-blue-400/10 text-blue-300"
                      : "border-white/10 bg-background/80 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Sort
          </label>
          <select
            value={sortOrder}
            aria-label="Sort journal activity"
            onChange={(e) => setSortOrder(e.target.value as JournalSortOrder)}
            className="rounded-full border border-white/10 bg-background/80 px-3 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Edit form shown inline when editing */}
      {editEntry && (
        <div className="mb-4">
          <JournalEntryForm
            editEntry={editEntry}
            onEditComplete={() => setEditingId(null)}
            onEditCancel={() => setEditingId(null)}
          />
        </div>
      )}

      {/* Sync status banner for failed entries */}
      {failedIds.length > 0 && (
        <div
          className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-400"
          role="alert"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span className="flex-1">
            {failedIds.length} entr{failedIds.length === 1 ? "y" : "ies"} failed to sync.
            Changes are saved locally and will be retried automatically.
          </span>
          <button
            onClick={() => {
              // Clear all failed markers
              failedIds.forEach((id) => clearFailed(id));
            }}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium hover:bg-amber-500/20 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No activity for these filters"
          description="Try a different type or status to see matching transactions."
          className="rounded-2xl border-dashed bg-white/5 py-8"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isPending = pendingIds.includes(item.id);
            const isFailed = failedIds.includes(item.id);
            const isDeleting = deletingId === item.id;

            return (
              <article
                key={item.id}
                className={cn(
                  "rounded-3xl border border-white/10 bg-background/80 p-4 shadow-sm transition-all",
                  isFailed && "border-amber-500/30 bg-amber-500/5",
                  isDeleting && "opacity-50"
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {item.assetPair}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.type.replace("_", " ")}
                      </p>
                    </div>
                    {/* Sync status indicators */}
                    {isPending && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-400">
                        <Loader2 size={10} className="animate-spin" />
                        Syncing
                      </span>
                    )}
                    {isFailed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
                        <AlertCircle size={10} />
                        Offline
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em]",
                        statusStyles[item.status]
                      )}
                    >
                      {item.status}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground">
                      {outcomeLabels[item.outcome]}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        Amount
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {item.amount} {item.token}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        Price
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        ${item.price}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        Time
                      </p>
                      <RelativeTimestamp timestamp={new Date(item.timestamp)} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Edit button */}
                    {editingId !== item.id && (
                      <button
                        onClick={() => setEditingId(item.id)}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-foreground transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
                        aria-label={`Edit ${item.assetPair} entry`}
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={isDeleting || editingId === item.id}
                      className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/5 px-3 py-1 text-red-400 transition hover:border-red-500/40 hover:bg-red-500/10 disabled:opacity-50"
                      aria-label={`Delete ${item.assetPair} entry`}
                    >
                      {isDeleting ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>

                    {item.hash ? (
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${item.hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-foreground transition hover:border-white/20"
                      >
                        Details <ArrowRight size={12} />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-muted-foreground">
                        <Clock3 size={12} /> Awaiting hash
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
