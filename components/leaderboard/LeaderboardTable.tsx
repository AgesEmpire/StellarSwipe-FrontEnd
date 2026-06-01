"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { LeaderboardEntry, LeaderboardTab } from "@/lib/leaderboard";
import { LeaderboardBadgeChip } from "./LeaderboardBadgeChip";
import { useLeaderboardStore } from "@/store/useLeaderboardStore";
import {
  TrendingUp,
  TrendingDown,
  UserCheck,
  UserPlus,
  ChevronUp,
  ChevronDown,
  Minus,
  Eye,
} from "lucide-react";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  activeTab: LeaderboardTab;
  onViewProfile: (id: string) => void;
}

type SortField = "rank" | "returnPct" | "winRate" | "portfolioGrowth" | "overallScore";
type SortDir = "asc" | "desc";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function RankDelta({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return <Minus size={12} className="text-muted-foreground" aria-label="New entry" />;
  const delta = previous - current; // positive = moved up
  if (delta > 0)
    return (
      <span className="flex items-center gap-0.5 text-green-400 text-xs" aria-label={`Up ${delta}`}>
        <TrendingUp size={12} aria-hidden="true" />
        {delta}
      </span>
    );
  if (delta < 0)
    return (
      <span className="flex items-center gap-0.5 text-red-400 text-xs" aria-label={`Down ${Math.abs(delta)}`}>
        <TrendingDown size={12} aria-hidden="true" />
        {Math.abs(delta)}
      </span>
    );
  return <Minus size={12} className="text-muted-foreground" aria-label="No change" />;
}

export function LeaderboardTable({
  entries,
  activeTab,
  onViewProfile,
}: LeaderboardTableProps) {
  const { toggleFollow, isFollowing } = useLeaderboardStore();
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "rank" ? "asc" : "desc");
    }
  }

  const sorted = [...entries].sort((a, b) => {
    const av = a[sortField];
    const bv = b[sortField];
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

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
          "flex items-center gap-1 transition-colors hover:text-foreground text-xs",
          active ? "text-foreground" : "text-muted-foreground",
          className
        )}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {active &&
          (sortDir === "asc" ? (
            <ChevronUp size={12} aria-hidden="true" />
          ) : (
            <ChevronDown size={12} aria-hidden="true" />
          ))}
      </button>
    );
  }

  if (sorted.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground text-sm">No entries match the current filters.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Leaderboard rankings table">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium w-16">
                <SortBtn field="rank" label="Rank" />
              </th>
              <th className="px-4 py-3 text-left font-medium">Trader</th>
              <th className="px-4 py-3 text-right font-medium">
                <SortBtn
                  field={activeTab === "providers" ? "winRate" : "portfolioGrowth"}
                  label={activeTab === "providers" ? "Win Rate" : "Growth"}
                  className="justify-end"
                />
              </th>
              <th className="px-4 py-3 text-right font-medium">
                <SortBtn field="returnPct" label="Return" className="justify-end" />
              </th>
              <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">
                <SortBtn field="overallScore" label="Score" className="justify-end" />
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden md:table-cell">
                Badges
              </th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground w-20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => {
              const following = isFollowing(entry.id);
              const displayName = entry.isAnonymized
                ? "Anonymous"
                : entry.name ?? truncateAddress(entry.address);

              return (
                <tr
                  key={entry.id}
                  className="border-b hover:bg-muted/20 transition-colors"
                >
                  {/* Rank */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-bold text-foreground">#{entry.rank}</span>
                      <RankDelta current={entry.rank} previous={entry.previousRank} />
                    </div>
                  </td>

                  {/* Trader info */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-sm font-bold text-white border border-white/10">
                        {entry.isAnonymized ? "?" : (entry.name?.[0] ?? "?")}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{displayName}</p>
                        {!entry.isAnonymized && (
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            {truncateAddress(entry.address)}
                          </p>
                        )}
                        {entry.badges.length > 0 && (
                          <div className="flex gap-1 mt-1 md:hidden">
                            {entry.badges.slice(0, 1).map((b) => (
                              <LeaderboardBadgeChip key={b.id} badge={b} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Win rate / portfolio growth */}
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-foreground">
                      {activeTab === "providers"
                        ? `${entry.winRate.toFixed(1)}%`
                        : `+${entry.portfolioGrowth.toFixed(1)}%`}
                    </span>
                  </td>

                  {/* Return */}
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        "font-bold",
                        entry.returnPct >= 0 ? "text-green-400" : "text-red-400"
                      )}
                    >
                      {entry.returnPct >= 0 ? "+" : ""}{entry.returnPct.toFixed(2)}%
                    </span>
                  </td>

                  {/* Score */}
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className="font-semibold text-blue-400">{entry.overallScore}</span>
                  </td>

                  {/* Badges */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap justify-center gap-1">
                      {entry.badges.slice(0, 3).map((b) => (
                        <LeaderboardBadgeChip key={b.id} badge={b} />
                      ))}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onViewProfile(entry.id)}
                        aria-label={`View profile of ${displayName}`}
                        className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Eye size={15} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => toggleFollow(entry.id)}
                        aria-label={following ? `Unfollow ${displayName}` : `Follow ${displayName}`}
                        aria-pressed={following}
                        className={cn(
                          "rounded-full p-1.5 transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          following
                            ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        {following ? (
                          <UserCheck size={15} aria-hidden="true" />
                        ) : (
                          <UserPlus size={15} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
