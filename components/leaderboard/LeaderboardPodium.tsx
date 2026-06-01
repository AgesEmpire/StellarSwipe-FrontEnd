"use client";

import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { LeaderboardBadgeChip } from "./LeaderboardBadgeChip";
import { UserCheck, UserPlus } from "lucide-react";
import { useLeaderboardStore } from "@/store/useLeaderboardStore";

interface LeaderboardPodiumProps {
  entries: LeaderboardEntry[]; // expects exactly 3
  onViewProfile: (id: string) => void;
}

const PODIUM_ORDER = [1, 0, 2]; // 2nd, 1st, 3rd visual order
const PODIUM_HEIGHTS = ["h-20", "h-28", "h-16"];
const PODIUM_MEDALS = ["🥈", "🥇", "🥉"];
const PODIUM_COLORS = [
  "border-gray-400/40 bg-gray-400/10",
  "border-yellow-400/50 bg-yellow-400/10",
  "border-amber-600/40 bg-amber-600/10",
];

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function LeaderboardPodium({ entries, onViewProfile }: LeaderboardPodiumProps) {
  const { toggleFollow, isFollowing } = useLeaderboardStore();

  return (
    <div
      aria-label="Top 3 leaderboard podium"
      className="flex items-end justify-center gap-3 sm:gap-6 pt-4"
    >
      {PODIUM_ORDER.map((entryIndex, podiumPos) => {
        const entry = entries[entryIndex];
        if (!entry) return null;
        const following = isFollowing(entry.id);

        return (
          <div
            key={entry.id}
            className="flex flex-col items-center gap-2 flex-1 max-w-[160px]"
          >
            {/* Avatar + follow */}
            <div className="relative">
              <button
                onClick={() => onViewProfile(entry.id)}
                className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-yellow-400/30 bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-xl font-bold text-white transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`View profile of ${entry.isAnonymized ? "Anonymous" : entry.name ?? truncateAddress(entry.address)}`}
              >
                {entry.isAnonymized
                  ? "?"
                  : (entry.name?.[0] ?? entry.address[0])}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFollow(entry.id);
                }}
                aria-label={following ? `Unfollow ${entry.name ?? "trader"}` : `Follow ${entry.name ?? "trader"}`}
                aria-pressed={following}
                className={cn(
                  "absolute -bottom-1 -right-1 rounded-full p-1 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  following
                    ? "bg-blue-500 text-white"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {following ? (
                  <UserCheck size={11} aria-hidden="true" />
                ) : (
                  <UserPlus size={11} aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Name */}
            <div className="text-center">
              <p className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                {entry.isAnonymized ? "Anonymous" : (entry.name ?? truncateAddress(entry.address))}
              </p>
              <p
                className={cn(
                  "text-sm font-bold",
                  entry.returnPct >= 0 ? "text-green-400" : "text-red-400"
                )}
              >
                {entry.returnPct >= 0 ? "+" : ""}{entry.returnPct.toFixed(1)}%
              </p>
            </div>

            {/* Badges (max 2) */}
            {entry.badges.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1">
                {entry.badges.slice(0, 2).map((b) => (
                  <LeaderboardBadgeChip key={b.id} badge={b} />
                ))}
              </div>
            )}

            {/* Podium block */}
            <div
              className={cn(
                "w-full rounded-t-lg border-t border-x flex items-center justify-center text-2xl",
                PODIUM_HEIGHTS[podiumPos],
                PODIUM_COLORS[podiumPos]
              )}
              aria-hidden="true"
            >
              {PODIUM_MEDALS[podiumPos]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
