/**
 * Leaderboard data types and mock data generator.
 * Supports global rankings, provider win-rate boards, and user portfolio growth boards.
 */

export type RankingPeriod = "daily" | "weekly" | "monthly" | "yearly" | "all";
export type MarketType = "all" | "crypto" | "forex" | "commodities";
export type LeaderboardTab = "providers" | "traders";

export interface LeaderboardBadge {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export interface LeaderboardEntry {
  id: string;
  address: string;
  /** Display name — null if anonymized */
  name: string | null;
  avatarSeed: string; // deterministic seed for avatar generation
  rank: number;
  previousRank: number | null;
  /** Return percentage for the selected period */
  returnPct: number;
  winRate: number;
  totalSignals: number;
  portfolioGrowth: number; // percentage
  overallScore: number; // 0–100
  recentPerformance: number;
  marketType: MarketType;
  isFollowed: boolean;
  isAnonymized: boolean;
  badges: LeaderboardBadge[];
  /** Manipulation safeguard: minimum trades required to appear */
  tradeCount: number;
  joinedAt: string;
}

// ─── Badge Definitions ────────────────────────────────────────────────────────

export const BADGES: Record<string, LeaderboardBadge> = {
  top_performer: {
    id: "top_performer",
    label: "Top Performer",
    emoji: "🏆",
    description: "Ranked #1 on the global leaderboard",
  },
  win_streak: {
    id: "win_streak",
    label: "Win Streak",
    emoji: "🔥",
    description: "10+ consecutive winning trades",
  },
  consistent: {
    id: "consistent",
    label: "Consistent",
    emoji: "📈",
    description: "Positive returns for 3+ consecutive months",
  },
  high_volume: {
    id: "high_volume",
    label: "High Volume",
    emoji: "⚡",
    description: "200+ trades completed",
  },
  crypto_expert: {
    id: "crypto_expert",
    label: "Crypto Expert",
    emoji: "₿",
    description: "Top 10 in crypto market category",
  },
  rising_star: {
    id: "rising_star",
    label: "Rising Star",
    emoji: "⭐",
    description: "Biggest rank improvement this week",
  },
  diamond_hands: {
    id: "diamond_hands",
    label: "Diamond Hands",
    emoji: "💎",
    description: "Held positions through 20%+ drawdown",
  },
};

// ─── Manipulation Safeguards ──────────────────────────────────────────────────

/** Minimum trades required to appear on leaderboard */
export const MIN_TRADE_COUNT = 10;
/** Minimum days active to appear on leaderboard */
export const MIN_DAYS_ACTIVE = 7;

export function meetsManipulationThreshold(entry: LeaderboardEntry): boolean {
  return entry.tradeCount >= MIN_TRADE_COUNT;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const NAMES = [
  "AlphaTrader", "SignalMaster", "TrendFollower", "ProSignals", "CryptoWizard",
  "StellarBull", "MoonShot", "DiamondHands", "WaveRider", "PrecisionTrader",
  "QuantEdge", "NightOwl", "SwingKing", "ScalpMaster", "TechAnalyst",
];

const ADDRESSES = [
  "GA7VIQKEA7HQNGYAUTALPC3D4GBTUFJGD2U7YKWXY7HXHPAWGP7XVFUA",
  "GAJQHJDHFVJDHBFJNHFDJHF7HXHPAWGP7XVFUA1234567890ABCDEFGH",
  "GBVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBV",
  "GCVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBV",
  "GDVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBV",
  "GEVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBV",
  "GFVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBV",
  "GGVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBV",
  "GHVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBV",
  "GIVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBV",
  "GJVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBV",
  "GKVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBV",
  "GLVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBV",
  "GMVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBV",
  "GNVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBV",
];

const MARKET_TYPES: MarketType[] = ["crypto", "forex", "commodities", "crypto", "crypto"];

function assignBadges(rank: number, winRate: number, tradeCount: number): LeaderboardBadge[] {
  const badges: LeaderboardBadge[] = [];
  if (rank === 1) badges.push(BADGES.top_performer);
  if (winRate >= 85) badges.push(BADGES.win_streak);
  if (winRate >= 75) badges.push(BADGES.consistent);
  if (tradeCount >= 200) badges.push(BADGES.high_volume);
  if (rank <= 10) badges.push(BADGES.crypto_expert);
  if (rank >= 8 && rank <= 12) badges.push(BADGES.rising_star);
  return badges;
}

export function generateMockLeaderboard(
  period: RankingPeriod = "weekly",
  marketFilter: MarketType = "all"
): LeaderboardEntry[] {
  // Seed variation by period so rankings shift
  const periodMultiplier: Record<RankingPeriod, number> = {
    daily: 1.2,
    weekly: 1.0,
    monthly: 0.85,
    yearly: 0.7,
    all: 0.6,
  };
  const mult = periodMultiplier[period];

  const entries: LeaderboardEntry[] = NAMES.map((name, i) => {
    const baseReturn = (15 - i * 0.8) * mult + (Math.sin(i * 2.3) * 3);
    const winRate = Math.max(45, Math.min(95, 88 - i * 1.8 + Math.cos(i) * 4));
    const tradeCount = 250 - i * 12 + Math.floor(Math.sin(i) * 20);
    const marketType = MARKET_TYPES[i % MARKET_TYPES.length];

    return {
      id: `trader-${i + 1}`,
      address: ADDRESSES[i] ?? `G${i}VDJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBVJKBV`,
      name: i === 3 ? null : name, // trader-4 is anonymized
      avatarSeed: `seed-${i}`,
      rank: i + 1,
      previousRank: i === 0 ? 2 : i === 1 ? 1 : i + 1 + (Math.random() > 0.5 ? 1 : -1),
      returnPct: parseFloat(baseReturn.toFixed(2)),
      winRate: parseFloat(winRate.toFixed(1)),
      totalSignals: 300 - i * 15,
      portfolioGrowth: parseFloat((baseReturn * 1.3).toFixed(2)),
      overallScore: Math.max(50, Math.round(95 - i * 2.5)),
      recentPerformance: parseFloat((baseReturn * 0.4 + Math.sin(i) * 2).toFixed(2)),
      marketType,
      isFollowed: i < 2,
      isAnonymized: i === 3,
      badges: assignBadges(i + 1, winRate, tradeCount),
      tradeCount,
      joinedAt: new Date(Date.now() - (365 - i * 20) * 86400000).toISOString(),
    };
  });

  // Apply market filter
  const filtered =
    marketFilter === "all"
      ? entries
      : entries.filter((e) => e.marketType === marketFilter);

  // Re-rank after filter
  return filtered.map((e, i) => ({ ...e, rank: i + 1 }));
}
