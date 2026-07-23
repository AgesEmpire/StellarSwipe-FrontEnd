"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useTransactionStore } from "@/store/useTransactionStore";
import { cn } from "@/lib/utils";
import { RelativeTimestamp } from "@/components/RelativeTimestamp";
import { EmptyState } from "@/components/ui/empty-state";

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
  const updateTransactionStatus = useTransactionStore(
    (state) => state.updateTransactionStatus
  );
  const [typeFilter, setTypeFilter] =
    useState<(typeof TYPE_OPTIONS)[number]["value"]>("ALL");
  const [statusFilter, setStatusFilter] =
    useState<(typeof OUTCOME_OPTIONS)[number]["value"]>("ALL");

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

  const filtered = useMemo(() => {
    return history
      .filter((item) => typeFilter === "ALL" || item.type === typeFilter)
      .filter((item) => statusFilter === "ALL" || item.status === statusFilter)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [history, typeFilter, statusFilter]);

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
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Type
          </label>
          <select
            value={typeFilter}
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
          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as (typeof OUTCOME_OPTIONS)[number]["value"]
              )
            }
            className="rounded-full border border-white/10 bg-background/80 px-3 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500"
          >
            {OUTCOME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No activity for these filters"
          description="Try a different type or status to see matching transactions."
          className="rounded-2xl border-dashed bg-white/5 py-8"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-white/10 bg-background/80 p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {item.assetPair}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.type.replace("_", " ")}
                  </p>
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
          ))}
        </div>
      )}
    </section>
  );
}
