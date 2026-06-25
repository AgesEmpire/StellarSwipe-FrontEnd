import React from "react";
import { useLeaderboardStore, type LeaderboardEntry } from "../store/leaderboardStore";
import { formatNumber } from "../lib/utils";

export const Leaderboard: React.FC = () => {
  const { rankings, loading, error, fetchRankings } = useLeaderboardStore();

  React.useEffect(() => {
    fetchRankings();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="text-accent-danger p-4">Failed to load leaderboard: {error}</div>;
  }

  return (
    <section className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-accent-market to-accent-primary text-transparent bg-clip-text">
        Community Leaderboard
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rankings.map((entry: LeaderboardEntry) => (
          <article
            key={entry.id}
            className="p-4 bg-surface bg-opacity-70 backdrop-filter backdrop-blur-lg rounded-xl shadow hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <img
                src={entry.avatarUrl}
                alt={entry.username}
                className="w-16 h-16 rounded-full object-cover border-2 border-accent-primary"
              />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground">
                  {entry.anonymous ? "Anonymous" : entry.username}
                </h2>
                <p className="text-sm text-foreground-muted">{entry.marketType}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-foreground-subtle">Return %</p>
                <p className="text-lg font-medium text-accent-success">
                  {formatNumber(entry.returnPct)}%
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
