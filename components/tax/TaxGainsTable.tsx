"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CapitalGainRecord } from "@/lib/taxReport";
import { ChevronUp, ChevronDown } from "lucide-react";

interface TaxGainsTableProps {
  records: CapitalGainRecord[];
}

type SortField = "asset" | "gain" | "proceeds" | "costBasis" | "holdingDays" | "disposedAt";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

function fmtUSD(v: number) {
  return `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function TaxGainsTable({ records }: TaxGainsTableProps) {
  const [sortField, setSortField] = useState<SortField>("disposedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterType, setFilterType] = useState<"ALL" | "SHORT_TERM" | "LONG_TERM">("ALL");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (filterType === "ALL") return records;
    return records.filter((r) => r.gainType === filterType);
  }, [records, filterType]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d: SortDir) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(0);
  }

  function SortBtn({
    field,
    label,
    className = "",
  }: {
    field: SortField;
    label: string;
    className?: string;
  }) {
    const active = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className={cn(
          "flex items-center gap-1 transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
          className
        )}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {active &&
          (sortDir === "asc" ? (
            <ChevronUp size={13} aria-hidden="true" />
          ) : (
            <ChevronDown size={13} aria-hidden="true" />
          ))}
      </button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Capital Gains &amp; Losses
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({records.length} records)
            </span>
          </h2>

          {/* Filter tabs */}
          <div
            role="tablist"
            aria-label="Filter by gain type"
            className="flex rounded-lg bg-muted/50 p-1 gap-1 w-fit"
          >
            {(["ALL", "SHORT_TERM", "LONG_TERM"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={filterType === t}
                onClick={() => {
                  setFilterType(t);
                  setPage(0);
                }}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  filterType === t
                    ? "bg-card text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "ALL" ? "All" : t === "SHORT_TERM" ? "Short-Term" : "Long-Term"}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {records.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              No taxable events found for this period.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Capital gains and losses table">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium">
                      <SortBtn field="asset" label="Asset" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      <SortBtn field="disposedAt" label="Date Sold" />
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      <SortBtn field="proceeds" label="Proceeds" className="justify-end" />
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      <SortBtn field="costBasis" label="Cost Basis" className="justify-end" />
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      <SortBtn field="gain" label="Gain / Loss" className="justify-end" />
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      <SortBtn field="holdingDays" label="Days Held" className="justify-end" />
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r: CapitalGainRecord) => (
                    <tr
                      key={`${r.tradeId}-${r.acquiredAt}`}
                      className="border-b hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-foreground">{r.asset}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(r.disposedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">
                        {fmtUSD(r.proceeds)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {fmtUSD(r.costBasis)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-mono font-semibold",
                          r.gain >= 0 ? "text-green-400" : "text-red-400"
                        )}
                      >
                        {r.gain >= 0 ? "+" : ""}
                        {fmtUSD(r.gain)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {r.holdingDays}d
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                            r.gainType === "SHORT_TERM"
                              ? "bg-orange-500/15 text-orange-300"
                              : "bg-blue-500/15 text-blue-300"
                          )}
                        >
                          {r.gainType === "SHORT_TERM" ? "ST" : "LT"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Showing {page * PAGE_SIZE + 1}–
                  {Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p: number) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded px-3 py-1 text-xs border border-border hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p: number) => Math.min(totalPages - 1, p + 1))}
                    disabled={page === totalPages - 1}
                    className="rounded px-3 py-1 text-xs border border-border hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
