import { useQuery } from "@tanstack/react-query";
import { generateMockLeaderboard } from "@/lib/leaderboard";
import { useLeaderboardStore } from "@/store/useLeaderboardStore";

export function useLeaderboard() {
  const { period, marketFilter } = useLeaderboardStore();

  return useQuery({
    queryKey: ["leaderboard", period, marketFilter],
    queryFn: async () => {
      // Simulate network latency
      await new Promise((r) => setTimeout(r, 300));
      return generateMockLeaderboard(period, marketFilter);
    },
    staleTime: 60_000,
  });
}
