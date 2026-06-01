"use client";

import type { LeaderboardBadge } from "@/lib/leaderboard";

interface LeaderboardBadgeChipProps {
  badge: LeaderboardBadge;
}

export function LeaderboardBadgeChip({ badge }: LeaderboardBadgeChipProps) {
  return (
    <span
      title={badge.description}
      aria-label={`${badge.label}: ${badge.description}`}
      className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-300"
    >
      <span aria-hidden="true">{badge.emoji}</span>
      <span className="hidden sm:inline">{badge.label}</span>
    </span>
  );
}
