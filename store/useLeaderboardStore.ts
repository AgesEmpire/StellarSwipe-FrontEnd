import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RankingPeriod, MarketType, LeaderboardTab } from "@/lib/leaderboard";

interface LeaderboardState {
  period: RankingPeriod;
  marketFilter: MarketType;
  activeTab: LeaderboardTab;
  followedIds: string[];
  setPeriod: (p: RankingPeriod) => void;
  setMarketFilter: (m: MarketType) => void;
  setActiveTab: (t: LeaderboardTab) => void;
  toggleFollow: (id: string) => void;
  isFollowing: (id: string) => boolean;
}

export const useLeaderboardStore = create<LeaderboardState>()(
  persist(
    (set, get) => ({
      period: "weekly",
      marketFilter: "all",
      activeTab: "providers",
      followedIds: [],
      setPeriod: (period) => set({ period }),
      setMarketFilter: (marketFilter) => set({ marketFilter }),
      setActiveTab: (activeTab) => set({ activeTab }),
      toggleFollow: (id) =>
        set((state) => ({
          followedIds: state.followedIds.includes(id)
            ? state.followedIds.filter((f) => f !== id)
            : [...state.followedIds, id],
        })),
      isFollowing: (id) => get().followedIds.includes(id),
    }),
    { name: "leaderboard-store" }
  )
);
